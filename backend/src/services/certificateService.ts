import crypto from 'crypto';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { db } from '../database/db';
import { CertificateRecord } from '../types';

export class CertificateService {
  /**
   * Generate a unique verified certificate and save to database
   */
  public generateCertificate(params: {
    recipientName: string;
    recipientEmail: string;
    role: CertificateRecord['role'];
    paperTitle?: string;
    conferenceId?: string;
  }): CertificateRecord {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const certificateNumber = `VIGNAN-CONF2026-CERT-${randomHex}`;

    // Verification hash using SHA-256
    const hashData = `${certificateNumber}:${params.recipientName}:${params.role}:${params.recipientEmail}`;
    const verificationHash = crypto.createHash('sha256').update(hashData).digest('hex');

    const issueDate = new Date().toISOString().split('T')[0];
    const conf = db.conferences[0] || { name: 'AGENTIC AI HACKATHON & CONFERENCE 2026' };

    const record: CertificateRecord = {
      id: `cert-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
      certificate_number: certificateNumber,
      conference_id: params.conferenceId || conf.id,
      conference_name: conf.name,
      recipient_name: params.recipientName,
      recipient_email: params.recipientEmail,
      role: params.role,
      paper_title: params.paperTitle,
      verification_hash: verificationHash,
      issueDate,
      verification_url: `/api/certificates/${certificateNumber}/verify`
    } as any;

    db.certificates.push(record);
    return record;
  }

  /**
   * Look up a certificate by number and verify authenticity
   */
  public verifyCertificate(certificateNumber: string): {
    valid: boolean;
    certificate?: CertificateRecord;
    verification_message: string;
  } {
    const cert = db.certificates.find(
      c => c.certificate_number.toLowerCase() === certificateNumber.toLowerCase().trim()
    );

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
   * Generate an official PDF certificate document
   */
  public async createPdfDocument(cert: CertificateRecord): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]); // A4 Landscape
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Decorative Borders
    page.drawRectangle({
      x: 25,
      y: 25,
      width: width - 50,
      height: height - 50,
      borderColor: rgb(0.14, 0.38, 0.57),
      borderWidth: 4,
    });

    page.drawRectangle({
      x: 32,
      y: 32,
      width: width - 64,
      height: height - 64,
      borderColor: rgb(0.89, 0.11, 0.14), // Vignan red accent
      borderWidth: 1.5,
    });

    // Institution Header
    page.drawText("VIGNAN'S FOUNDATION FOR SCIENCE, TECHNOLOGY & RESEARCH", {
      x: 100,
      y: height - 75,
      size: 16,
      font: fontBold,
      color: rgb(0.89, 0.11, 0.14),
    });

    page.drawText('(Deemed to be University) - Estd. u/s 3 of UGC Act 1956 | NAAC A+ | NIRF 70th Rank', {
      x: 170,
      y: height - 95,
      size: 11,
      font: fontRegular,
      color: rgb(0.2, 0.3, 0.4),
    });

    // Title
    page.drawText('CERTIFICATE OF ACADEMIC RECOGNITION', {
      x: 160,
      y: height - 160,
      size: 24,
      font: fontBold,
      color: rgb(0.06, 0.16, 0.28),
    });

    page.drawText('This certificate is proudly conferred upon', {
      x: 270,
      y: height - 200,
      size: 13,
      font: fontOblique,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Recipient Name
    const nameWidth = fontBold.widthOfTextAtSize(cert.recipient_name, 26);
    page.drawText(cert.recipient_name, {
      x: (width - nameWidth) / 2,
      y: height - 250,
      size: 26,
      font: fontBold,
      color: rgb(0.14, 0.38, 0.8),
    });

    // Presentation description
    const desc = `In grateful recognition of exemplary contribution as ${cert.role} at the`;
    const descWidth = fontRegular.widthOfTextAtSize(desc, 13);
    page.drawText(desc, {
      x: (width - descWidth) / 2,
      y: height - 290,
      size: 13,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });

    const confTitle = cert.conference_name || 'AGENTIC AI HACKATHON & CONFERENCE 2026';
    const confWidth = fontBold.widthOfTextAtSize(confTitle, 14);
    page.drawText(confTitle, {
      x: (width - confWidth) / 2,
      y: height - 315,
      size: 14,
      font: fontBold,
      color: rgb(0.06, 0.16, 0.28),
    });

    if (cert.paper_title) {
      const paperLine = `Paper: "${cert.paper_title}"`;
      const pWidth = fontOblique.widthOfTextAtSize(paperLine.slice(0, 80), 11);
      page.drawText(paperLine.slice(0, 80), {
        x: (width - pWidth) / 2,
        y: height - 345,
        size: 11,
        font: fontOblique,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    // Footer Signatures & Metadata
    page.drawText(`Certificate ID: ${cert.certificate_number}`, {
      x: 60,
      y: 60,
      size: 9,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText(`Issued: ${cert.issue_date} | Verifiable at: vignan.ac.in/verify`, {
      x: 60,
      y: 45,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText('Dr. Radhika Sharma', {
      x: width - 240,
      y: 80,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText('General Chair, AGENTIC-AI-2026', {
      x: width - 240,
      y: 65,
      size: 10,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    return await pdfDoc.save();
  }
}

export const certificateService = new CertificateService();
