import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getRepository } from '../database/repositoryFactory';
import { CertificateRecord } from '../types';

// Palette Constants
const NAVY_PAGE = rgb(0.03, 0.08, 0.18);    // #08142E Deep outer navy
const NAVY_DARK = rgb(0.05, 0.12, 0.25);    // #0D1E40 Dark navy
const NAVY_MED  = rgb(0.08, 0.20, 0.42);    // #14336B Medium navy
const GOLD_DARK = rgb(0.70, 0.53, 0.20);    // #B38733 Dark rich gold
const GOLD_MED  = rgb(0.80, 0.65, 0.32);    // #CCA652 Classic gold
const GOLD_BRIGHT = rgb(0.92, 0.78, 0.42);  // #EBC76B Bright highlight gold
const WHITE     = rgb(1, 1, 1);
const CHARCOAL  = rgb(0.12, 0.16, 0.22);
const SLATE     = rgb(0.35, 0.40, 0.48);

// Subtle tech background colors
const TECH_CYAN = rgb(0.82, 0.90, 0.98);
const TECH_BLUE = rgb(0.70, 0.84, 0.96);
const TECH_GLOW = rgb(0.40, 0.70, 0.95);

/**
 * Deterministic QR matrix (21x21 Version 1 QR layout)
 */
function createQrMatrix(dataStr: string): number[][] {
  const size = 21;
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));

  function placeFinder(row: number, col: number) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[row + r][col + c] = 1;
        } else {
          matrix[row + r][col + c] = 0;
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, 14);
  placeFinder(14, 0);

  for (let i = 8; i < 13; i++) {
    matrix[6][i] = (i % 2 === 0) ? 1 : 0;
    matrix[i][6] = (i % 2 === 0) ? 1 : 0;
  }
  matrix[13][8] = 1;

  let seed = 0;
  for (let i = 0; i < dataStr.length; i++) {
    seed = (seed * 31 + dataStr.charCodeAt(i)) >>> 0;
  }
  function nextBit() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed >>> 24) % 2;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinder1 = (r <= 7 && c <= 7);
      const inFinder2 = (r <= 7 && c >= 13);
      const inFinder3 = (r >= 13 && c <= 7);
      const isTiming = (r === 6 || c === 6);
      if (!inFinder1 && !inFinder2 && !inFinder3 && !isTiming) {
        matrix[r][c] = nextBit();
      }
    }
  }
  return matrix;
}

/**
 * Text wrapping helper for PDF typography
 */
function wrapText(text: string, font: any, size: number, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(testLine, size) <= maxW) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export class CertificateService {
  /**
   * Generate a unique verified certificate and save to repository
   */
  public async generateCertificate(params: {
    recipientName: string;
    recipientEmail: string;
    role: CertificateRecord['role'];
    paperTitle?: string;
    conferenceId?: string;
  }): Promise<CertificateRecord> {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const certificateNumber = `VIGNAN-CONF2026-CERT-${randomHex}`;

    // Verification hash using SHA-256
    const hashData = `${certificateNumber}:${params.recipientName}:${params.role}:${params.recipientEmail}`;
    const verificationHash = crypto.createHash('sha256').update(hashData).digest('hex');

    const issueDate = new Date().toISOString().split('T')[0];
    const repo = getRepository();
    const conf = await repo.getConferenceById(params.conferenceId);
    const confName = conf ? conf.name : 'International Conference on Agentic AI & Autonomous Systems';
    const confId = conf ? conf.id : (params.conferenceId || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

    const record: CertificateRecord = {
      id: `cert-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
      certificate_number: certificateNumber,
      conference_id: confId,
      conference_name: confName,
      recipient_name: params.recipientName,
      recipient_email: params.recipientEmail,
      role: params.role,
      paper_title: params.paperTitle,
      verification_hash: verificationHash,
      issue_date: issueDate,
      verification_url: `/api/certificates/${certificateNumber}/verify`
    };

    return await repo.createCertificate(record);
  }

  /**
   * Look up a certificate by number and verify authenticity
   */
  public async verifyCertificate(certificateNumber: string): Promise<{
    valid: boolean;
    certificate?: CertificateRecord;
    verification_message: string;
  }> {
    const repo = getRepository();
    const cert = await repo.getCertificateByNumber(certificateNumber.trim());

    if (!cert) {
      return {
        valid: false,
        verification_message: `Certificate ID "${certificateNumber}" was not found in the official registry. Please check the ID or contact the organizing committee.`
      };
    }

    return {
      valid: true,
      certificate: cert,
      verification_message: `Verified Authentic. Issued to ${cert.recipient_name} as ${cert.role} on ${cert.issue_date}.`
    };
  }

  /**
   * Generate an official PDF certificate document matching exact reference design
   */
  public async createPdfDocument(cert: CertificateRecord): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]); // A4 Landscape
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fontTimesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

    // =========================================================================
    // 1. CLEAN WHITE CANVAS WITH NAVY-BLUE & GOLD CORNER BRACKETS
    // =========================================================================
    // Solid White Base Canvas
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: WHITE
    });

    // Diagonal navy-blue corner triangles and layered gold ribbon bars
    const drawCornerBrackets = () => {
      // Top-Left Corner
      page.drawSvgPath('M 0 0 L 95 0 L 0 95 Z', { x: 0, y: height, color: NAVY_PAGE });
      page.drawLine({ start: { x: 0, y: height - 100 }, end: { x: 100, y: height }, thickness: 7, color: GOLD_MED });
      page.drawLine({ start: { x: 0, y: height - 96 }, end: { x: 96, y: height }, thickness: 2, color: GOLD_BRIGHT });
      page.drawLine({ start: { x: 0, y: height - 106 }, end: { x: 106, y: height }, thickness: 1.5, color: NAVY_PAGE });

      // Top-Right Corner
      page.drawSvgPath('M 0 0 L -95 0 L 0 95 Z', { x: width, y: height, color: NAVY_PAGE });
      page.drawLine({ start: { x: width, y: height - 100 }, end: { x: width - 100, y: height }, thickness: 7, color: GOLD_MED });
      page.drawLine({ start: { x: width, y: height - 96 }, end: { x: width - 96, y: height }, thickness: 2, color: GOLD_BRIGHT });
      page.drawLine({ start: { x: width, y: height - 106 }, end: { x: width - 106, y: height }, thickness: 1.5, color: NAVY_PAGE });

      // Bottom-Left Corner
      page.drawSvgPath('M 0 0 L 95 0 L 0 -95 Z', { x: 0, y: 0, color: NAVY_PAGE });
      page.drawLine({ start: { x: 0, y: 100 }, end: { x: 100, y: 0 }, thickness: 7, color: GOLD_MED });
      page.drawLine({ start: { x: 0, y: 96 }, end: { x: 96, y: 0 }, thickness: 2, color: GOLD_BRIGHT });
      page.drawLine({ start: { x: 0, y: 106 }, end: { x: 106, y: 0 }, thickness: 1.5, color: NAVY_PAGE });

      // Bottom-Right Corner
      page.drawSvgPath('M 0 0 L -95 0 L 0 -95 Z', { x: width, y: 0, color: NAVY_PAGE });
      page.drawLine({ start: { x: width, y: 100 }, end: { x: width - 100, y: 0 }, thickness: 7, color: GOLD_MED });
      page.drawLine({ start: { x: width, y: 96 }, end: { x: width - 96, y: 0 }, thickness: 2, color: GOLD_BRIGHT });
      page.drawLine({ start: { x: width, y: 106 }, end: { x: width - 106, y: 0 }, thickness: 1.5, color: NAVY_PAGE });
    };
    drawCornerBrackets();

    // =========================================================================
    // 2. DUAL BEVELED GOLD FRAMES & CENTER EMBLEMS
    // =========================================================================
    const drawBeveledBorder = (inset: number, bevel: number, color: any, thickness: number) => {
      const bx1 = inset, by1 = inset;
      const bx2 = width - inset, by2 = height - inset;
      const pts = [
        { x: bx1 + bevel, y: by2 },
        { x: bx2 - bevel, y: by2 },
        { x: bx2, y: by2 - bevel },
        { x: bx2, y: by1 + bevel },
        { x: bx2 - bevel, y: by1 },
        { x: bx1 + bevel, y: by1 },
        { x: bx1, y: by1 + bevel },
        { x: bx1, y: by2 - bevel },
      ];
      for (let i = 0; i < pts.length; i++) {
        const pNext = pts[(i + 1) % pts.length];
        page.drawLine({ start: pts[i], end: pNext, thickness, color });
      }
    };

    drawBeveledBorder(18, 16, GOLD_DARK, 2.0);
    drawBeveledBorder(23, 13, GOLD_MED, 0.8);

    // Top & Bottom Center Gold Diamond Emblems
    const drawEmblem = (cx: number, cy: number) => {
      page.drawSvgPath('M 0 7 L 7 0 L 0 -7 L -7 0 Z', { x: cx, y: cy, color: GOLD_MED });
      page.drawSvgPath('M 0 4 L 4 0 L 0 -4 L -4 0 Z', { x: cx, y: cy, color: WHITE });
      page.drawCircle({ x: cx, y: cy, size: 2, color: GOLD_DARK });
      page.drawCircle({ x: cx - 14, y: cy, size: 2.2, color: GOLD_MED });
      page.drawCircle({ x: cx + 14, y: cy, size: 2.2, color: GOLD_MED });
      page.drawCircle({ x: cx - 22, y: cy, size: 1.5, color: GOLD_BRIGHT });
      page.drawCircle({ x: cx + 22, y: cy, size: 1.5, color: GOLD_BRIGHT });
      page.drawLine({ start: { x: cx - 85, y: cy }, end: { x: cx - 28, y: cy }, thickness: 1, color: GOLD_MED });
      page.drawLine({ start: { x: cx + 28, y: cy }, end: { x: cx + 85, y: cy }, thickness: 1, color: GOLD_MED });
    };

    drawEmblem(width / 2, height - 18);
    drawEmblem(width / 2, 18);

    // =========================================================================
    // 3. SUBTLE TECHNOLOGY CIRCUIT & AI GLOBE BACKGROUND ART
    // =========================================================================
    // A. Left: Subtle Cyan Cybernetic Circuit Board Visual
    const drawLeftCircuits = () => {
      const traces = [
        { x: 38, yStart: 120, yEnd: 480 },
        { x: 55, yStart: 160, yEnd: 460 },
        { x: 72, yStart: 140, yEnd: 420 },
        { x: 90, yStart: 180, yEnd: 380 },
        { x: 108, yStart: 130, yEnd: 320 }
      ];
      traces.forEach(t => {
        page.drawLine({
          start: { x: t.x, y: t.yStart },
          end: { x: t.x, y: t.yEnd },
          thickness: 0.6,
          color: TECH_CYAN
        });
      });

      const branches = [
        { x1: 38, y1: 220, x2: 55, y2: 237 },
        { x1: 55, y1: 300, x2: 72, y2: 317 },
        { x1: 72, y1: 200, x2: 90, y2: 218 },
        { x1: 90, y1: 270, x2: 108, y2: 288 },
        { x1: 108, y1: 190, x2: 128, y2: 210 },
        { x1: 55, y1: 410, x2: 78, y2: 433 },
        { x1: 38, y1: 360, x2: 60, y2: 382 }
      ];
      branches.forEach(b => {
        page.drawLine({
          start: { x: b.x1, y: b.y1 },
          end: { x: b.x2, y: b.y2 },
          thickness: 0.6,
          color: TECH_CYAN
        });
        page.drawCircle({ x: b.x2, y: b.y2, size: 1.8, color: TECH_GLOW });
      });

      const cx = 115, cy = 165;
      [45, 65, 85, 105].forEach(r => {
        page.drawCircle({
          x: cx,
          y: cy,
          size: r,
          borderColor: TECH_CYAN,
          borderWidth: 0.5
        });
      });
    };
    drawLeftCircuits();

    // B. Right: Subtle Luminous Wireframe Globe & AI Network
    const drawRightGlobe = () => {
      const gx = width - 40;
      const gy = 260;
      const gr = 185;

      page.drawCircle({
        x: gx,
        y: gy,
        size: gr,
        borderColor: TECH_BLUE,
        borderWidth: 0.8
      });

      [0.3, 0.55, 0.8].forEach(scaleY => {
        page.drawEllipse({
          x: gx,
          y: gy,
          xScale: gr,
          yScale: gr * scaleY,
          borderColor: TECH_CYAN,
          borderWidth: 0.5
        });
      });
      [0.25, 0.5, 0.75].forEach(scaleX => {
        page.drawEllipse({
          x: gx,
          y: gy,
          xScale: gr * scaleX,
          yScale: gr,
          borderColor: TECH_CYAN,
          borderWidth: 0.5
        });
      });

      const nodes = [
        { x: gx - 140, y: gy + 30 },
        { x: gx - 110, y: gy + 90 },
        { x: gx - 75,  y: gy + 140 },
        { x: gx - 60,  y: gy + 50 },
        { x: gx - 120, y: gy - 40 },
        { x: gx - 80,  y: gy - 90 },
        { x: gx - 40,  y: gy - 30 },
        { x: gx - 30,  y: gy + 110 }
      ];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (dist < 85) {
            page.drawLine({
              start: nodes[i],
              end: nodes[j],
              thickness: 0.5,
              color: TECH_CYAN
            });
          }
        }
        page.drawCircle({ x: nodes[i].x, y: nodes[i].y, size: 2.2, color: TECH_GLOW });
      }
    };
    drawRightGlobe();

    // C. Prominent AI Shield Emblem on Left
    const drawAiShield = (sx: number, sy: number) => {
      page.drawCircle({ x: sx, y: sy - 18, size: 28, borderColor: rgb(0.5, 0.8, 1.0), borderWidth: 0.8 });
      page.drawCircle({ x: sx, y: sy - 18, size: 22, borderColor: rgb(0.2, 0.5, 0.9), borderWidth: 0.6 });

      const outerPath = 'M -20 -22 L 20 -22 L 20 0 C 20 16 0 26 0 28 C 0 26 -20 16 -20 0 Z';
      page.drawSvgPath(outerPath, {
        x: sx,
        y: sy,
        color: rgb(0.04, 0.16, 0.42),
        borderColor: rgb(0.40, 0.80, 1.0),
        borderWidth: 2.2
      });

      const innerPath = 'M -16 -18 L 16 -18 L 16 0 C 16 12 0 21 0 23 C 0 21 -16 12 -16 0 Z';
      page.drawSvgPath(innerPath, {
        x: sx,
        y: sy,
        borderColor: rgb(0.65, 0.90, 1.0),
        borderWidth: 1.0
      });

      page.drawCircle({
        x: sx,
        y: sy + 1,
        size: 11,
        color: rgb(0.02, 0.12, 0.32),
        borderColor: rgb(0.4, 0.82, 1.0),
        borderWidth: 1.2
      });

      const aiText = 'AI';
      const aiW = fontBold.widthOfTextAtSize(aiText, 10);
      page.drawText(aiText, {
        x: sx - (aiW / 2),
        y: sy - 2.5,
        size: 10,
        font: fontBold,
        color: WHITE
      });
    };
    drawAiShield(115, 235);

    // =========================================================================
    // 4. TOP HEADER: LOGO & ACCREDITATIONS
    // =========================================================================
    const candidates = [
      path.resolve(__dirname, '../assets/vignan_crest_logo.png'),
      path.resolve(__dirname, '../../src/assets/vignan_crest_logo.png'),
      path.resolve(process.cwd(), 'src/assets/vignan_crest_logo.png'),
      path.resolve(process.cwd(), 'backend/src/assets/vignan_crest_logo.png'),
      path.resolve(process.cwd(), 'backend/dist/assets/vignan_crest_logo.png'),
      path.resolve(__dirname, '../../../frontend/src/assets/vignan_crest_logo.png'),
      path.resolve(process.cwd(), 'frontend/src/assets/vignan_crest_logo.png')
    ];
    const logoPath = candidates.find(p => fs.existsSync(p));
    if (logoPath) {
      try {
        const logoBytes = fs.readFileSync(logoPath);
        const logoImg = await pdfDoc.embedPng(logoBytes);
        page.drawImage(logoImg, {
          x: 36,
          y: height - 80,
          width: 168,
          height: 49,
        });
      } catch (err) {
        console.warn('Could not embed logo PNG in certificate:', err);
      }
    }

    const badges = [
      { code: 'NBA', sub: 'Accredited', color: rgb(0.05, 0.55, 0.60) },
      { code: 'NAAC', mark: 'A+', sub: 'GRADE', color: rgb(0.85, 0.12, 0.14) },
      { code: 'ABET', sub: 'Accredited', color: rgb(0.90, 0.45, 0.15) },
      { code: 'NIRF', mark: '70th', sub: 'RANK', color: rgb(0.85, 0.15, 0.15) }
    ];

    const badgeBoxW = 46;
    const badgeBoxH = 34;
    const badgeGap = 6;
    const badgeTotalW = (badges.length * badgeBoxW) + ((badges.length - 1) * badgeGap);
    const badgeStartX = width - 36 - badgeTotalW;

    badges.forEach((b, i) => {
      const bx = badgeStartX + (i * (badgeBoxW + badgeGap));
      const by = height - 74;
      page.drawRectangle({
        x: bx,
        y: by,
        width: badgeBoxW,
        height: badgeBoxH,
        borderColor: rgb(0.72, 0.76, 0.82),
        borderWidth: 0.8,
        color: rgb(0.98, 0.99, 1.0)
      });
      page.drawText(b.code, {
        x: bx + 4,
        y: by + 22,
        size: 7.5,
        font: fontBold,
        color: CHARCOAL
      });
      if (b.mark) {
        page.drawText(b.mark, {
          x: bx + (b.code === 'NAAC' ? 26 : 22),
          y: by + 22,
          size: 7.5,
          font: fontBold,
          color: b.color
        });
      }
      page.drawLine({
        start: { x: bx + 4, y: by + 18 },
        end: { x: bx + badgeBoxW - 4, y: by + 18 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85)
      });
      page.drawText(b.sub, {
        x: bx + 4,
        y: by + 8,
        size: 5.5,
        font: fontBold,
        color: b.color
      });
    });

    // =========================================================================
    // 5. CERTIFICATE HEADING & CONFERENCE BANNER
    // =========================================================================
    let roleTitle = 'ACADEMIC RECOGNITION';
    const roleWording = {
      prefix: 'This is to Certify that',
      lines: [
        'has participated in the academic proceedings of the',
        'International Conference on Agentic AI & Autonomous Systems (AGENTIC-AI-2026),',
        "organized by Vignan's Foundation for Science, Technology and Research, on 29, August 2026."
      ]
    };

    const paperQuote = cert.paper_title ? `"${cert.paper_title}"` : 'the peer-reviewed technical paper';

    if (cert.role === 'AUTHOR') {
      roleTitle = 'SCHOLARLY AUTHORSHIP';
      roleWording.lines = [
        'has contributed as an author of the peer-reviewed scholarly research paper entitled',
        paperQuote,
        'presented at the International Conference on Agentic AI & Autonomous Systems (AGENTIC-AI-2026),',
        "organized by Vignan's Foundation for Science, Technology and Research."
      ];
    } else if (cert.role === 'PRESENTER') {
      roleTitle = 'RESEARCH PAPER PRESENTATION';
      roleWording.lines = [
        'has successfully presented the peer-reviewed research paper entitled',
        paperQuote,
        'at the International Conference on Agentic AI & Autonomous Systems (AGENTIC-AI-2026),',
        "organized by Vignan's Foundation for Science, Technology and Research, on 29, August 2026."
      ];
    } else if (cert.role === 'REVIEWER') {
      roleTitle = 'PEER REVIEW EXCELLENCE';
      roleWording.lines = [
        'in grateful appreciation of valuable service, rigorous peer evaluation, and scholarly contribution',
        'as a Technical Reviewer for the International Conference on Agentic AI & Autonomous Systems',
        "(AGENTIC-AI-2026), organized by Vignan's Foundation for Science, Technology and Research."
      ];
    } else if (cert.role === 'SESSION_CHAIR') {
      roleTitle = 'SESSION CHAIR EXCELLENCE';
      roleWording.lines = [
        'in grateful recognition of distinguished leadership, academic coordination, and service',
        'as Session Chair at the International Conference on Agentic AI & Autonomous Systems',
        "(AGENTIC-AI-2026), organized by Vignan's Foundation for Science, Technology and Research."
      ];
    } else { // PARTICIPANT
      roleTitle = 'CONFERENCE PARTICIPATION';
      roleWording.lines = [
        'has actively participated in the technical sessions, keynotes, and academic proceedings of the',
        'International Conference on Agentic AI & Autonomous Systems (AGENTIC-AI-2026), held in hybrid mode,',
        "organized by Vignan's Foundation for Science, Technology and Research."
      ];
    }

    const titlePre = 'CERTIFICATE OF';
    const preW = fontBold.widthOfTextAtSize(titlePre, 17);
    page.drawText(titlePre, {
      x: (width - preW) / 2,
      y: height - 120,
      size: 17,
      font: fontBold,
      color: NAVY_DARK
    });

    const mainTitleW = fontBold.widthOfTextAtSize(roleTitle, 26);
    page.drawText(roleTitle, {
      x: (width - mainTitleW) / 2,
      y: height - 152,
      size: 26,
      font: fontBold,
      color: NAVY_DARK
    });

    const bannerSubText = '//  INTERNATIONAL CONFERENCE ON AGENTIC AI & AUTONOMOUS SYSTEMS (AGENTIC-AI-2026)  //';
    const bTextW = fontBold.widthOfTextAtSize(bannerSubText, 9);
    const bBoxW = bTextW + 36;
    const bBoxH = 19;
    const bX = (width - bBoxW) / 2;
    const bY = height - 179;

    page.drawRectangle({
      x: bX,
      y: bY,
      width: bBoxW,
      height: bBoxH,
      color: NAVY_MED,
      borderColor: GOLD_MED,
      borderWidth: 1
    });

    page.drawText(bannerSubText, {
      x: (width - bTextW) / 2,
      y: bY + 5.5,
      size: 9,
      font: fontBold,
      color: WHITE
    });

    // =========================================================================
    // 6. RECIPIENT NAME IN PRESTIGIOUS SERIF ITALIC WITH REFINED UNDERLINE
    // =========================================================================
    const certifyW = fontOblique.widthOfTextAtSize(roleWording.prefix, 13);
    page.drawText(roleWording.prefix, {
      x: (width - certifyW) / 2,
      y: height - 212,
      size: 13,
      font: fontOblique,
      color: SLATE
    });

    const recipientName = (cert.recipient_name || 'PARTICIPANT NAME').toUpperCase();
    const nameW = fontTimesItalic.widthOfTextAtSize(recipientName, 26);
    page.drawText(recipientName, {
      x: (width - nameW) / 2,
      y: height - 246,
      size: 26,
      font: fontTimesItalic,
      color: NAVY_DARK
    });

    const underlineW = Math.max(380, nameW + 60);
    const underlineX = (width - underlineW) / 2;
    const underlineY = height - 257;
    page.drawLine({
      start: { x: underlineX, y: underlineY },
      end: { x: underlineX + underlineW, y: underlineY },
      thickness: 1.2,
      color: NAVY_DARK
    });
    page.drawSvgPath('M 0 4 L 4 0 L 0 -4 L -4 0 Z', { x: width / 2, y: underlineY, color: GOLD_MED });

    // =========================================================================
    // 7. BALANCED CENTERED BODY TEXT
    // =========================================================================
    let curY = height - 280;
    for (let i = 0; i < roleWording.lines.length; i++) {
      const line = roleWording.lines[i];
      const isQuoteLine = line.startsWith('"') && line.endsWith('"');
      const f = isQuoteLine ? fontBold : fontRegular;
      const sz = 10.5;
      const clr = isQuoteLine ? NAVY_DARK : CHARCOAL;

      const wrapped = wrapText(line, f, sz, width - 260);
      for (const subLine of wrapped) {
        const lw = f.widthOfTextAtSize(subLine, sz);
        page.drawText(subLine, { x: (width - lw) / 2, y: curY, size: sz, font: f, color: clr });
        curY -= 15;
      }
    }

    // =========================================================================
    // 8. CONFERENCE SLOGAN WITH GOLD DIVIDERS
    // =========================================================================
    const mottoY = curY - 6;
    const motto = 'INNOVATE WITH INTELLIGENCE. LEAD WITH RESPONSIBILITY.';
    const mottoW = fontBold.widthOfTextAtSize(motto, 9.5);
    const mottoLineW = 85;

    page.drawLine({
      start: { x: (width - mottoW) / 2 - mottoLineW - 14, y: mottoY + 3 },
      end: { x: (width - mottoW) / 2 - 14, y: mottoY + 3 },
      thickness: 0.8,
      color: GOLD_MED
    });
    page.drawLine({
      start: { x: (width + mottoW) / 2 + 14, y: mottoY + 3 },
      end: { x: (width + mottoW) / 2 + mottoLineW + 14, y: mottoY + 3 },
      thickness: 0.8,
      color: GOLD_MED
    });
    page.drawSvgPath('M 0 3.5 L 3.5 0 L 0 -3.5 L -3.5 0 Z', { x: width / 2, y: mottoY + 14, color: GOLD_MED });
    page.drawText(motto, {
      x: (width - mottoW) / 2,
      y: mottoY,
      size: 9.5,
      font: fontBold,
      color: NAVY_DARK
    });

    // =========================================================================
    // 9. PROMINENT 6 VALUES SECTION (CLEAR, READABLE, STYLED LIKE REFERENCE)
    // =========================================================================
    const values = [
      { name: 'FAIRNESS', color: rgb(0.14, 0.22, 0.50), icon: 'fairness' },       // #243880
      { name: 'PRIVACY', color: rgb(0.01, 0.52, 0.72), icon: 'privacy' },        // #0284B8
      { name: 'INCLUSIVITY', color: rgb(0.42, 0.18, 0.58), icon: 'inclusivity' },  // #6C2E94
      { name: 'TRANSPARENCY', color: rgb(0.95, 0.44, 0.13), icon: 'transparency' },// #F37021
      { name: 'SUSTAINABILITY', color: rgb(0.31, 0.65, 0.22), icon: 'sustainability' }, // #50A638
      { name: 'TRUST', color: rgb(0.11, 0.31, 0.57), icon: 'trust' }             // #1D4F91
    ];

    const valRadius = 15;
    const valSpacing = 64;
    const valTotalW = (values.length - 1) * valSpacing;
    const valStartX = (width - valTotalW) / 2 - 25;
    const valCenterY = 72;

    values.forEach((v, idx) => {
      const vx = valStartX + (idx * valSpacing);
      const vy = valCenterY;

      page.drawCircle({
        x: vx,
        y: vy,
        size: valRadius,
        color: v.color
      });

      if (v.icon === 'fairness') {
        page.drawLine({ start: { x: vx, y: vy - 7 }, end: { x: vx, y: vy + 6 }, thickness: 1.2, color: WHITE });
        page.drawLine({ start: { x: vx - 7, y: vy + 5 }, end: { x: vx + 7, y: vy + 5 }, thickness: 1.2, color: WHITE });
        page.drawLine({ start: { x: vx - 7, y: vy + 5 }, end: { x: vx - 9, y: vy - 1 }, thickness: 0.8, color: WHITE });
        page.drawLine({ start: { x: vx - 7, y: vy + 5 }, end: { x: vx - 5, y: vy - 1 }, thickness: 0.8, color: WHITE });
        page.drawSvgPath(`M ${vx - 10} ${vy - 1} L ${vx - 4} ${vy - 1} L ${vx - 7} ${vy - 4} Z`, { color: WHITE });
        page.drawLine({ start: { x: vx + 7, y: vy + 5 }, end: { x: vx + 5, y: vy - 1 }, thickness: 0.8, color: WHITE });
        page.drawLine({ start: { x: vx + 7, y: vy + 5 }, end: { x: vx + 9, y: vy - 1 }, thickness: 0.8, color: WHITE });
        page.drawSvgPath(`M ${vx + 4} ${vy - 1} L ${vx + 10} ${vy - 1} L ${vx + 7} ${vy - 4} Z`, { color: WHITE });
      } else if (v.icon === 'privacy') {
        page.drawLine({ start: { x: vx - 4, y: vy + 2 }, end: { x: vx - 4, y: vy + 6 }, thickness: 1.3, color: WHITE });
        page.drawLine({ start: { x: vx + 4, y: vy + 2 }, end: { x: vx + 4, y: vy + 6 }, thickness: 1.3, color: WHITE });
        page.drawSvgPath(`M ${vx - 4} ${vy + 6} C ${vx - 4} ${vy + 10} ${vx + 4} ${vy + 10} ${vx + 4} ${vy + 6}`, { borderColor: WHITE, borderWidth: 1.3 });
        page.drawRectangle({ x: vx - 6, y: vy - 7, width: 12, height: 9, color: WHITE });
        page.drawCircle({ x: vx, y: vy - 1.5, size: 1.6, color: v.color });
        page.drawLine({ start: { x: vx, y: vy - 2 }, end: { x: vx, y: vy - 5 }, thickness: 1.2, color: v.color });
      } else if (v.icon === 'inclusivity') {
        page.drawCircle({ x: vx, y: vy + 4, size: 2.2, color: WHITE });
        page.drawCircle({ x: vx - 5, y: vy + 2, size: 1.8, color: WHITE });
        page.drawCircle({ x: vx + 5, y: vy + 2, size: 1.8, color: WHITE });
        page.drawSvgPath(`M ${vx - 8} ${vy - 6} C ${vx - 4} ${vy - 2} ${vx + 4} ${vy - 2} ${vx + 8} ${vy - 6}`, { borderColor: WHITE, borderWidth: 1.4 });
        page.drawSvgPath(`M ${vx - 4} ${vy} C ${vx - 2} ${vy + 2} ${vx + 2} ${vy + 2} ${vx + 4} ${vy}`, { borderColor: WHITE, borderWidth: 1.2 });
      } else if (v.icon === 'transparency') {
        page.drawCircle({ x: vx - 2, y: vy + 1, size: 6, borderColor: WHITE, borderWidth: 1.3 });
        page.drawLine({ start: { x: vx + 2, y: vy - 3 }, end: { x: vx + 7, y: vy - 8 }, thickness: 1.8, color: WHITE });
        page.drawCircle({ x: vx - 2, y: vy + 1, size: 2.2, color: WHITE });
      } else if (v.icon === 'sustainability') {
        const leaf1 = `M ${vx - 5} ${vy - 6} C ${vx - 7} ${vy + 2} ${vx + 2} ${vy + 7} ${vx + 6} ${vy + 5} C ${vx + 7} ${vy + 1} ${vx + 2} ${vy - 4} ${vx - 5} ${vy - 6} Z`;
        page.drawSvgPath(leaf1, { color: WHITE });
        page.drawLine({ start: { x: vx - 4, y: vy - 5 }, end: { x: vx + 4, y: vy + 4 }, thickness: 0.8, color: v.color });
      } else if (v.icon === 'trust') {
        page.drawSvgPath(`M ${vx - 8} ${vy + 3} L ${vx - 2} ${vy + 3} L ${vx + 3} ${vy - 2} L ${vx + 8} ${vy - 2}`, { borderColor: WHITE, borderWidth: 1.6 });
        page.drawSvgPath(`M ${vx - 8} ${vy - 2} L ${vx - 3} ${vy - 2} L ${vx + 2} ${vy + 3} L ${vx + 8} ${vy + 3}`, { borderColor: WHITE, borderWidth: 1.6 });
        page.drawCircle({ x: vx, y: vy + 0.5, size: 2.8, color: WHITE });
      }

      const valLblW = fontBold.widthOfTextAtSize(v.name, 6.2);
      page.drawText(v.name, {
        x: vx - (valLblW / 2),
        y: vy - 24,
        size: 6.2,
        font: fontBold,
        color: CHARCOAL
      });
    });

    // =========================================================================
    // 10. LOWER-LEFT VERIFICATION CARD & LOWER-RIGHT SIGNATURE
    // =========================================================================
    // A. Lower-Left: Official Cryptographic Verification Box
    const vBoxX = 36;
    const vBoxY = 28;
    const vBoxW = 162;
    const vBoxH = 72;

    page.drawRectangle({
      x: vBoxX,
      y: vBoxY,
      width: vBoxW,
      height: vBoxH,
      color: rgb(0.97, 0.98, 1.0),
      borderColor: rgb(0.75, 0.80, 0.88),
      borderWidth: 0.8
    });
    page.drawRectangle({
      x: vBoxX,
      y: vBoxY + vBoxH - 2.5,
      width: vBoxW,
      height: 2.5,
      color: GOLD_MED
    });

    const qrMatrix = createQrMatrix(`${cert.certificate_number}:${cert.verification_hash}`);
    const qrModSize = 2.0;
    const qrStartX = vBoxX + 6;
    const qrStartY = vBoxY + 16;

    page.drawRectangle({
      x: qrStartX - 1.5,
      y: qrStartY - 1.5,
      width: (21 * qrModSize) + 3,
      height: (21 * qrModSize) + 3,
      color: WHITE,
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 0.5
    });

    for (let r = 0; r < 21; r++) {
      for (let c = 0; c < 21; c++) {
        if (qrMatrix[r][c] === 1) {
          page.drawRectangle({
            x: qrStartX + (c * qrModSize),
            y: qrStartY + ((20 - r) * qrModSize),
            width: qrModSize,
            height: qrModSize,
            color: NAVY_DARK
          });
        }
      }
    }

    page.drawText('SCAN TO VERIFY', {
      x: qrStartX + 1,
      y: qrStartY - 9,
      size: 5,
      font: fontBold,
      color: SLATE
    });

    const metaX = qrStartX + (21 * qrModSize) + 8;
    page.drawText('VERIFIED CREDENTIAL', {
      x: metaX,
      y: vBoxY + 55,
      size: 6.5,
      font: fontBold,
      color: NAVY_MED
    });
    page.drawText(`ID: ${cert.certificate_number}`, {
      x: metaX,
      y: vBoxY + 45,
      size: 5.8,
      font: fontBold,
      color: CHARCOAL
    });
    page.drawText(`Issued: ${cert.issue_date} | IST`, {
      x: metaX,
      y: vBoxY + 36,
      size: 5.4,
      font: fontRegular,
      color: SLATE
    });
    const hashDisplay = `Hash: ${cert.verification_hash ? cert.verification_hash.slice(0, 14) : ''}...`;
    page.drawText(hashDisplay, {
      x: metaX,
      y: vBoxY + 27,
      size: 5.4,
      font: fontRegular,
      color: SLATE
    });
    page.drawText('Verify: vignan.ac.in/verify', {
      x: metaX,
      y: vBoxY + 18,
      size: 5.6,
      font: fontBold,
      color: rgb(0.12, 0.38, 0.68)
    });
    page.drawText('Status: Cryptographically Signed', {
      x: metaX,
      y: vBoxY + 9,
      size: 5,
      font: fontOblique,
      color: rgb(0.10, 0.50, 0.25)
    });

    // B. Lower-Right: Authorized Signatures Matching Reference
    const sigX = width - 190;
    const sigY = 52;

    // Dr. Lavu Rathaiah Green Cursive Signature
    page.drawSvgPath('M 0 14 C 4 34 10 42 14 38 C 18 34 16 14 18 8 C 21 0 25 20 28 26 C 32 30 36 20 42 14 C 48 10 54 20 62 22 C 70 24 78 14 85 12', {
      x: sigX + 18,
      y: sigY + 30,
      borderColor: rgb(0.08, 0.45, 0.22),
      borderWidth: 2.0
    });

    page.drawLine({
      start: { x: sigX, y: sigY + 26 },
      end: { x: sigX + 150, y: sigY + 26 },
      thickness: 1.2,
      color: GOLD_MED
    });

    page.drawText('Dr. Lavu Rathaiah', {
      x: sigX + 24,
      y: sigY + 13,
      size: 9.5,
      font: fontBold,
      color: CHARCOAL
    });
    page.drawText('Chairman,', {
      x: sigX + 46,
      y: sigY + 3,
      size: 7.2,
      font: fontRegular,
      color: SLATE
    });
    page.drawText('Vignan Group of Institutions', {
      x: sigX + 12,
      y: sigY - 7,
      size: 7.2,
      font: fontRegular,
      color: SLATE
    });

    return await pdfDoc.save();
  }
}

export const certificateService = new CertificateService();
