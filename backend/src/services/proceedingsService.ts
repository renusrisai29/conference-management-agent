import { getRepository } from '../database/repositoryFactory';
import { ProceedingsRecord } from '../types';

export class ProceedingsService {
  /**
   * Compile the official conference proceedings from accepted papers
   */
  public async compileProceedings(conferenceId?: string, customIsbn?: string): Promise<ProceedingsRecord> {
    const repo = getRepository();
    const conf = await repo.getConferenceById(conferenceId);
    const confId = conf ? conf.id : (conferenceId || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    const allPapers = await repo.getSubmissions(confId);
    const acceptedPapers = allPapers.filter(s => s.status === 'ACCEPTED' || s.status === 'CAMERA_READY');
    const tracks = await repo.getTracks(confId);

    // Group papers by track for table of contents
    const tocByTrack: { [trackName: string]: any[] } = {};
    let currentPage = 1;

    for (const paper of acceptedPapers) {
      const track = tracks.find(t => t.id === paper.track_id);
      const trackName = track ? track.name : (paper.track_name || 'General Research Track');

      if (!tocByTrack[trackName]) tocByTrack[trackName] = [];

      const startPage = currentPage;
      const endPage = startPage + (paper.page_count || 8) - 1;
      currentPage = endPage + 1;

      tocByTrack[trackName].push({
        paper_number: paper.paper_number,
        title: paper.title,
        authors: paper.authors ? paper.authors.map(a => `${a.name} (${a.institution})`).join(', ') : '',
        page_range: `pp. ${startPage}-${endPage}`
      });
    }

    const tableOfContents = Object.entries(tocByTrack).map(([track_name, papers]) => ({
      track_name,
      papers
    }));

    // ISBN policy enforcement: if customIsbn supplied and valid, use it; otherwise 'ISBN pending'
    const finalIsbn = customIsbn && customIsbn.trim().length > 5 ? customIsbn.trim() : (conf?.isbn || 'ISBN pending');

    const proceedingsRecord: ProceedingsRecord = {
      id: `proc-${Date.now().toString().slice(-6)}`,
      conference_id: confId,
      title: `Proceedings of the ${conf?.name || 'International Conference on Agentic AI & Autonomous Systems'}`,
      theme: conf?.theme || 'Architectures, Collaboration, and Governance of Autonomous AI Agents',
      isbn: finalIsbn,
      total_papers: acceptedPapers.length,
      total_pages: Math.max(1, currentPage - 1),
      table_of_contents: tableOfContents,
      compiled_at: new Date().toISOString()
    };

    return await repo.saveProceedings(proceedingsRecord);
  }
}

export const proceedingsService = new ProceedingsService();
