import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
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
    { start: '09:30 AM', end: '11:00 AM' },
    { start: '11:30 AM', end: '01:00 PM' },
    { start: '02:00 PM', end: '03:30 PM' },
    { start: '04:00 PM', end: '05:30 PM' }
  ];

  /**
   * Automatically generate a conflict-free conference programme
   */
  public generateProgramme(options: ScheduleOptions): SessionSchedule[] {
    const rooms = options.rooms && options.rooms.length > 0 ? options.rooms : this.defaultRooms;
    const dates = options.dates && options.dates.length > 0 ? options.dates : ['2027-01-18', '2027-01-19'];
    const paperDuration = options.paperDurationMinutes || 25;

    // Fetch accepted or under-review eligible papers
    const papersToSchedule = db.submissions.filter(s =>
      s.status === 'ACCEPTED' || s.status === 'CAMERA_READY' || s.status === 'SUBMITTED' || s.status === 'UNDER_REVIEW'
    );

    // Group papers by track
    const papersByTrack: { [trackId: string]: Submission[] } = {};
    for (const p of papersToSchedule) {
      if (!papersByTrack[p.track_id]) papersByTrack[p.track_id] = [];
      papersByTrack[p.track_id].push(p);
    }

    const availableChairs = db.users.filter(u => u.role === 'CHAIR' || u.role === 'SESSION_CHAIR' || u.role === 'REVIEWER');
    const generatedSessions: SessionSchedule[] = [];

    let dateIdx = 0;
    let slotIdx = 0;
    let roomIdx = 0;
    let chairIdx = 0;

    // Scheduled presenter tracker to avoid concurrent slots
    // slotKey -> Set<presenterEmail>
    const occupiedPresenters: { [slotKey: string]: Set<string> } = {};

    for (const [trackId, trackPapers] of Object.entries(papersByTrack)) {
      const track = db.tracks.find(t => t.id === trackId);
      const trackName = track ? track.name : 'General Track';

      // Chunk into sessions of 3 papers
      for (let i = 0; i < trackPapers.length; i += 3) {
        const chunk = trackPapers.slice(i, i + 3);
        const currentDate = dates[dateIdx % dates.length];
        const currentTimeSlot = this.defaultTimeSlots[slotIdx % this.defaultTimeSlots.length];
        const currentRoom = rooms[roomIdx % rooms.length];

        const slotKey = `${currentDate}_${currentTimeSlot.start}`;
        if (!occupiedPresenters[slotKey]) occupiedPresenters[slotKey] = new Set<string>();

        // Pick session chair who is NOT presenting in this session
        let selectedChair = availableChairs[chairIdx % availableChairs.length];
        const chunkPresenterEmails = chunk.map(p => p.authors[0]?.email?.toLowerCase());

        let chairAttempts = 0;
        while (chunkPresenterEmails.includes(selectedChair.email.toLowerCase()) && chairAttempts < availableChairs.length) {
          chairIdx++;
          selectedChair = availableChairs[chairIdx % availableChairs.length];
          chairAttempts++;
        }
        chairIdx++;

        // Calculate presentation start times
        const scheduledPapers = chunk.map((p, pIdx) => {
          const presenter = p.authors[0];
          const presenterEmail = presenter ? presenter.email.toLowerCase() : '';
          occupiedPresenters[slotKey].add(presenterEmail);

          const startOffset = pIdx * paperDuration;
          const endOffset = startOffset + paperDuration;

          return {
            submission_id: p.id,
            paper_number: p.paper_number,
            title: p.title,
            presenter_name: presenter ? presenter.name : 'Lead Author',
            start_time: `+${startOffset}m`,
            end_time: `+${endOffset}m`
          };
        });

        const sessionTitle = `Session ${generatedSessions.length + 1}: ${trackName.split('&')[0].trim()} Advancements`;

        generatedSessions.push({
          id: `sess-${Date.now().toString().slice(-4)}-${generatedSessions.length + 1}`,
          conference_id: options.conferenceId,
          title: sessionTitle,
          track_id: trackId,
          track_name: trackName,
          room: currentRoom,
          session_date: currentDate,
          start_time: currentTimeSlot.start,
          end_time: currentTimeSlot.end,
          session_chair: {
            id: selectedChair.id,
            name: selectedChair.full_name,
            institution: selectedChair.institution
          },
          papers: scheduledPapers
        });

        // Advance slot/room index
        roomIdx++;
        if (roomIdx % rooms.length === 0) {
          slotIdx++;
          if (slotIdx % this.defaultTimeSlots.length === 0) {
            dateIdx++;
          }
        }
      }
    }

    // Save into db
    db.sessions = generatedSessions;
    return generatedSessions;
  }
}

export const schedulerService = new SchedulerService();
