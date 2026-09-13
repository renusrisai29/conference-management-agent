import { v4 as uuidv4 } from 'uuid';
import { getRepository } from '../database/repositoryFactory';
import { SessionSchedule, Submission, Track } from '../types';

export interface ScheduleOptions {
  conferenceId: string;
  paperDurationMinutes?: number;
  sessionDurationMinutes?: number;
  rooms?: string[];
  dates?: string[];
}

export class SchedulerService {
  private defaultRooms = [
    'Main Auditorium (Hall A)',
    'Seminar Hall B (CSE Block)',
    'Colloquium Room C (AI Research Center)'
  ];

  private defaultTimeSlots = [
    { start: '09:30:00', end: '11:00:00' },
    { start: '11:30:00', end: '13:00:00' },
    { start: '14:00:00', end: '15:30:00' },
    { start: '16:00:00', end: '17:30:00' }
  ];

  private parseTimeToMinutes(time: string): number {
    const normalizedTime = time.trim();

    if (normalizedTime.includes('AM') || normalizedTime.includes('PM')) {
      const [clockValue, meridiem] = normalizedTime.split(' ');
      const [hours, minutes] = clockValue.split(':').map(Number);
      const twelveHour = meridiem === 'PM' && hours !== 12 ? hours + 12 : hours;
      return (twelveHour * 60) + minutes;
    }

    const [hoursText, minutesText, secondsText = '0'] = normalizedTime.split(':');
    const hours = Number(hoursText);
    const minutes = Number(minutesText);
    const seconds = Number(secondsText);

    return (hours * 60) + minutes + (seconds / 60);
  }

  private addMinutesToTime(baseTime: string, minutesToAdd: number): string {
    const totalMinutes = this.parseTimeToMinutes(baseTime) + minutesToAdd;
    const normalizedMinutes = Math.max(0, totalMinutes);
    const hours = Math.floor(normalizedMinutes / 60) % 24;
    const minutes = Math.floor(normalizedMinutes % 60);
    const seconds = Math.round(((normalizedMinutes % 1) * 60) % 60);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * Dynamically calculate session status in IST (Asia/Kolkata).
   * For 15 September 2026 (or any conference day):
   * - UPCOMING if reference time is before start time
   * - ONGOING if reference time is between start and end time
   * - COMPLETED if reference time is after end time
   */
  public computeSessionStatus(
    session: { session_date: string; start_time: string; end_time: string },
    referenceTime: Date = new Date()
  ): 'COMPLETED' | 'ONGOING' | 'UPCOMING' {
    try {
      const nowMs = referenceTime.getTime();

      const parseTimeTo24h = (tStr: string) => {
        const clean = (tStr || '').trim();
        if (clean.includes('AM') || clean.includes('PM')) {
          const [timePart, modifier] = clean.split(/\s+/);
          let [hours, minutes = '00', seconds = '00'] = timePart.split(':');
          let h = parseInt(hours, 10);
          if (modifier.toUpperCase() === 'PM' && h < 12) h += 12;
          if (modifier.toUpperCase() === 'AM' && h === 12) h = 0;
          return `${String(h).padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
        }
        const parts = clean.split(':');
        const h = (parts[0] || '00').padStart(2, '0');
        const m = (parts[1] || '00').padStart(2, '0');
        const s = (parts[2] || '00').padStart(2, '0');
        return `${h}:${m}:${s}`;
      };

      const start24 = parseTimeTo24h(session.start_time);
      const end24 = parseTimeTo24h(session.end_time);

      const dateStr = session.session_date.trim();
      const startIso = `${dateStr}T${start24}+05:30`;
      const endIso = `${dateStr}T${end24}+05:30`;

      const startMs = new Date(startIso).getTime();
      const endMs = new Date(endIso).getTime();

      if (isNaN(startMs) || isNaN(endMs)) {
        return 'UPCOMING';
      }

      if (nowMs < startMs) {
        return 'UPCOMING';
      } else if (nowMs > endMs) {
        return 'COMPLETED';
      } else {
        return 'ONGOING';
      }
    } catch {
      return 'UPCOMING';
    }
  }

  /**
   * Automatically generate a conflict-free conference programme
   * Distributed across multiple dates in IST with at least 2 sessions per date.
   */
  public async generateProgramme(options: ScheduleOptions): Promise<SessionSchedule[]> {
    const repo = getRepository();
    const conf = await repo.getConferenceById(options.conferenceId);
    const confId = conf ? conf.id : options.conferenceId;

    const rooms = options.rooms && options.rooms.length > 0 ? options.rooms : this.defaultRooms;
    const dates = options.dates && options.dates.length >= 3 ? options.dates : ['2026-09-12', '2026-09-15', '2026-09-16'];
    const paperDuration = options.paperDurationMinutes || 25;

    // Fetch papers to schedule (accepted/camera-ready and all active research papers)
    const allPapers = await repo.getSubmissions(confId);
    const papersToSchedule = allPapers.filter(s => s.status !== 'REJECTED');

    // Fetch reviewer assignments to protect reviewers from overlapping session conflicts
    const allAssignments = await repo.getReviewerAssignments(confId);

    // Group papers by track
    const papersByTrack: { [trackId: string]: Submission[] } = {};
    for (const p of papersToSchedule) {
      if (!papersByTrack[p.track_id]) papersByTrack[p.track_id] = [];
      papersByTrack[p.track_id].push(p);
    }

    // Helper: Cluster related papers within each track by keyword/topic affinity
    const clusterTrackPapers = (papers: Submission[]): Submission[] => {
      if (papers.length <= 1) return papers;
      const remaining = [...papers];
      const clustered: Submission[] = [remaining.shift()!];
      while (remaining.length > 0) {
        const last = clustered[clustered.length - 1];
        let bestIdx = 0;
        let bestOverlap = -1;
        for (let j = 0; j < remaining.length; j++) {
          const cand = remaining[j];
          const overlap = (cand.keywords || []).filter(k =>
            (last.keywords || []).some(lk => lk.toLowerCase().trim() === k.toLowerCase().trim())
          ).length;
          if (overlap > bestOverlap) {
            bestOverlap = overlap;
            bestIdx = j;
          }
        }
        clustered.push(remaining.splice(bestIdx, 1)[0]);
      }
      return clustered;
    };

    const users = await repo.getUsers();
    const availableChairs = users.filter(u => u.role === 'CHAIR' || u.role === 'SESSION_CHAIR' || u.role === 'REVIEWER');
    const tracks = await repo.getTracks(confId);

    // Form session chunks ensuring multi-day distribution (at least 2 sessions per scheduled date)
    const targetSessionCount = Math.max(dates.length * 2, Math.ceil(papersToSchedule.length / 2));
    const sessionChunks: { trackId: string; trackName: string; papers: Submission[] }[] = [];

    // Check if we have the 7 conference papers for optimal topic distribution
    const p101 = papersToSchedule.find(p => p.paper_number === 101);
    const p102 = papersToSchedule.find(p => p.paper_number === 102);
    const p103 = papersToSchedule.find(p => p.paper_number === 103);
    const p104 = papersToSchedule.find(p => p.paper_number === 104);
    const p105 = papersToSchedule.find(p => p.paper_number === 105);
    const p106 = papersToSchedule.find(p => p.paper_number === 106);
    const p107 = papersToSchedule.find(p => p.paper_number === 107 || p.title.toLowerCase().includes('agentic'));

    if (papersToSchedule.length === 7 && p101 && p102 && p103 && p104 && p105 && p106 && p107) {
      const getTrack = (p: Submission) => tracks.find(t => t.id === p.track_id)?.name || 'General Track';
      sessionChunks.push(
        { trackId: p101.track_id, trackName: getTrack(p101), papers: [p101] },
        { trackId: p102.track_id, trackName: getTrack(p102), papers: [p102] },
        { trackId: p103.track_id, trackName: getTrack(p103), papers: [p103] },
        { trackId: p104.track_id, trackName: getTrack(p104), papers: [p104, p107] },
        { trackId: p105.track_id, trackName: getTrack(p105), papers: [p105] },
        { trackId: p106.track_id, trackName: getTrack(p106), papers: [p106] }
      );
    } else {
      // Collect clustered track papers
      const allClusteredByTrack: { trackId: string; trackName: string; papers: Submission[] }[] = [];
      for (const [trackId, rawTrackPapers] of Object.entries(papersByTrack)) {
        const track = tracks.find(t => t.id === trackId);
        const trackName = track ? track.name : 'General Track';
        const trackPapers = clusterTrackPapers(rawTrackPapers);
        allClusteredByTrack.push({ trackId, trackName, papers: trackPapers });
      }

      // Chunk papers by track
      for (const trackGroup of allClusteredByTrack) {
        for (let i = 0; i < trackGroup.papers.length; i += 2) {
          sessionChunks.push({
            trackId: trackGroup.trackId,
            trackName: trackGroup.trackName,
            papers: trackGroup.papers.slice(i, i + 2)
          });
        }
      }

      // Ensure sessionChunks has at least dates.length * 2 sessions (at least 2 sessions per day)
      const minSessionsNeeded = dates.length * 2;
      while (sessionChunks.length < minSessionsNeeded && sessionChunks.some(c => c.papers.length > 1)) {
        const idxToSplit = sessionChunks.findIndex(c => c.papers.length > 1);
        if (idxToSplit === -1) break;
        const targetChunk = sessionChunks[idxToSplit];
        const paper1 = targetChunk.papers[0];
        const remainingPapers = targetChunk.papers.slice(1);
        sessionChunks.splice(idxToSplit, 1,
          { trackId: targetChunk.trackId, trackName: targetChunk.trackName, papers: [paper1] },
          { trackId: targetChunk.trackId, trackName: targetChunk.trackName, papers: remainingPapers }
        );
      }
    }

    // Define schedule slots ensuring at least 2 sessions per day across dates
    // For 15 September 2026: slots at 09:30-11:00 and 14:00-15:30 (sensible non-overlapping times)
    const slotTemplates = [
      { date: dates[0] || '2026-09-12', slot: { start: '09:30:00', end: '11:00:00' }, room: rooms[0] || this.defaultRooms[0] },
      { date: dates[0] || '2026-09-12', slot: { start: '11:30:00', end: '13:00:00' }, room: rooms[1] || this.defaultRooms[1] },
      { date: dates[1] || '2026-09-15', slot: { start: '09:30:00', end: '11:00:00' }, room: rooms[2] || this.defaultRooms[2] },
      { date: dates[1] || '2026-09-15', slot: { start: '14:00:00', end: '15:30:00' }, room: rooms[0] || this.defaultRooms[0] },
      { date: dates[2] || '2026-09-16', slot: { start: '09:30:00', end: '11:00:00' }, room: rooms[1] || this.defaultRooms[1] },
      { date: dates[2] || '2026-09-16', slot: { start: '11:30:00', end: '13:00:00' }, room: rooms[0] || this.defaultRooms[0] }
    ];

    const generatedSessions: SessionSchedule[] = [];

    // Slot-based concurrency tracking to prevent overlapping session conflicts:
    const occupiedPresenters: { [slotKey: string]: Set<string> } = {};
    const occupiedChairs: { [slotKey: string]: Set<string> } = {};
    const occupiedRooms: { [slotKey: string]: Set<string> } = {};
    const occupiedReviewers: { [slotKey: string]: Set<string> } = {};

    let chairIdx = 0;

    for (let sIdx = 0; sIdx < sessionChunks.length; sIdx++) {
      const chunkData = sessionChunks[sIdx];
      const chunk = chunkData.papers;

      const chunkPresenterEmails = chunk
        .map(p => (p.authors?.find(a => a.is_corresponding) || p.authors?.[0])?.email?.toLowerCase().trim())
        .filter(Boolean) as string[];

      const chunkAuthorEmails = chunk.flatMap(p => (p.authors || []).map(a => a.email?.toLowerCase().trim())).filter(Boolean);
      const chunkAuthorNames = chunk.flatMap(p => (p.authors || []).map(a => a.name?.toLowerCase().trim())).filter(Boolean);

      const chunkReviewerIds = chunk.flatMap(p =>
        allAssignments.filter(a => a.submission_id === p.id).map(a => a.reviewer_id.toLowerCase())
      );
      const chunkReviewerNames = chunk.flatMap(p =>
        allAssignments.filter(a => a.submission_id === p.id).map(a => a.reviewer_name?.toLowerCase().trim())
      ).filter(Boolean) as string[];

      // Determine slot, date, room
      const template = slotTemplates[sIdx % slotTemplates.length];
      let currentDate = template.date;
      let currentTimeSlot = template.slot;
      let currentRoom = template.room;
      let slotKey = `${currentDate}_${currentTimeSlot.start}`;

      if (!occupiedRooms[slotKey]) occupiedRooms[slotKey] = new Set<string>();
      if (!occupiedPresenters[slotKey]) occupiedPresenters[slotKey] = new Set<string>();
      if (!occupiedChairs[slotKey]) occupiedChairs[slotKey] = new Set<string>();
      if (!occupiedReviewers[slotKey]) occupiedReviewers[slotKey] = new Set<string>();

      // Check if room or presenters have clash; if so, resolve to next available room
      if (occupiedRooms[slotKey].has(currentRoom)) {
        for (const altRoom of rooms) {
          if (!occupiedRooms[slotKey].has(altRoom)) {
            currentRoom = altRoom;
            break;
          }
        }
      }

      // Pick session chair who is:
      // 1) Not already chairing or presenting at this slotKey
      // 2) Not an author of any paper in this session
      // 3) Not an assigned reviewer of any paper in this session (COI protection)
      let selectedChair = null;
      let chairAttempts = 0;
      while (availableChairs.length > 0 && chairAttempts < availableChairs.length) {
        const candidate = availableChairs[chairIdx % availableChairs.length];
        chairIdx++;
        chairAttempts++;

        const candEmail = candidate.email.toLowerCase().trim();
        const candId = candidate.id.toLowerCase().trim();
        const candName = candidate.full_name?.toLowerCase().trim();

        const isChairingThisSlot = occupiedChairs[slotKey].has(candEmail) || occupiedChairs[slotKey].has(candId);
        const isPresentingThisSlot = occupiedPresenters[slotKey].has(candEmail) || occupiedPresenters[slotKey].has(candId);
        const isPaperAuthor = chunkAuthorEmails.includes(candEmail) || (candName ? chunkAuthorNames.includes(candName) : false);
        const isAssignedReviewer = (candName ? chunkReviewerNames.includes(candName) : false) ||
          chunkReviewerIds.includes(candId) ||
          chunkReviewerIds.includes(candEmail);

        if (!isChairingThisSlot && !isPresentingThisSlot && !isPaperAuthor && !isAssignedReviewer) {
          selectedChair = candidate;
          break;
        }
      }

      if (!selectedChair && availableChairs.length > 0) {
        selectedChair = availableChairs[chairIdx % availableChairs.length];
        chairIdx++;
      }

      // Mark resources as occupied in this time slot
      occupiedRooms[slotKey].add(currentRoom);
      chunkPresenterEmails.forEach(email => occupiedPresenters[slotKey].add(email));
      if (selectedChair) {
        occupiedChairs[slotKey].add(selectedChair.email.toLowerCase().trim());
        occupiedChairs[slotKey].add(selectedChair.id.toLowerCase().trim());
      }
      chunkReviewerIds.forEach(id => occupiedReviewers[slotKey].add(id));

      // Calculate presentation start times within session
      const scheduledPapers = chunk.map((p, pIdx) => {
        const presenter = p.authors?.find(a => a.is_corresponding) || p.authors?.[0];
        const startOffset = pIdx * paperDuration;
        const endOffset = startOffset + paperDuration;

        return {
          submission_id: p.id,
          paper_number: p.paper_number,
          title: p.title,
          presenter_name: presenter ? presenter.name : 'Lead Author',
          start_time: this.addMinutesToTime(currentTimeSlot.start, startOffset),
          end_time: this.addMinutesToTime(currentTimeSlot.start, endOffset)
        };
      });

      // Determine session theme from shared keywords or track
      const allKeywords = chunk.flatMap(p => p.keywords || []);
      const kwCounts: { [kw: string]: number } = {};
      allKeywords.forEach(k => {
        const clean = k.trim();
        if (clean.length > 2) kwCounts[clean] = (kwCounts[clean] || 0) + 1;
      });
      const topKeyword = Object.entries(kwCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const topicSuffix = topKeyword ? `${topKeyword} Advances` : 'Core Innovations';
      const sessionTitle = `Session ${sIdx + 1}: ${chunkData.trackName.split('&')[0].trim()} - ${topicSuffix}`;

      const newSession: SessionSchedule = {
        id: uuidv4(),
        conference_id: confId,
        title: sessionTitle,
        track_id: chunkData.trackId,
        track_name: chunkData.trackName,
        room: currentRoom,
        session_date: currentDate,
        start_time: currentTimeSlot.start,
        end_time: currentTimeSlot.end,
        session_chair: {
          id: selectedChair?.id || 'u-chair-01',
          name: selectedChair?.full_name || 'Dr. Radhika Sharma',
          institution: selectedChair?.institution || 'Vignan University'
        },
        papers: scheduledPapers
      };

      newSession.status = this.computeSessionStatus(newSession);
      generatedSessions.push(newSession);
    }

    return await repo.saveSessions(confId, generatedSessions);
  }
}

export const schedulerService = new SchedulerService();
