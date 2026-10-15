import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface SampleAuthor {
  id: string;
  name: string;
  email: string;
  penName?: string | null;
  phone?: string | null;
  country?: string;
  bankAccountLinked?: boolean;
  bankName?: string | null;
  accountNumberMasked?: string | null;
  ifscCode?: string | null;
  panMasked?: string | null;
  bio?: string | null;
}

interface SampleBook {
  id: string;
  authorId: string;
  title: string;
  isbn: string;
  genre: string;
  publicationDate?: string | null;
  status: string;
  productionStage?: string | null;
  mrp: number;
  printingCost?: number;
  platformCommission?: number;
  shippingCharge?: number;
  copiesSold?: number;
  totalRoyaltyEarned?: number;
  royaltyPaid?: number;
  royaltyPending?: number;
  platforms?: string[];
  synopsis?: string | null;
}

interface SampleData {
  authors: SampleAuthor[];
  books: SampleBook[];
}

export async function seed() {
  console.log('🌱 Starting BookLeaf Database Seeding...');

  // 1. Locate dataset
  const rootDataPath = path.join(process.cwd(), 'bookleaf_sample_data.json');
  const bundledDataPath = path.join(process.cwd(), 'data', 'bookleaf_sample_data.json');

  let rawData: SampleData;
  if (fs.existsSync(rootDataPath)) {
    console.log(`📁 Loading provided dataset from root: ${rootDataPath}`);
    rawData = JSON.parse(fs.readFileSync(rootDataPath, 'utf8'));
  } else if (fs.existsSync(bundledDataPath)) {
    console.log(`📁 Loading reference dataset: ${bundledDataPath}`);
    rawData = JSON.parse(fs.readFileSync(bundledDataPath, 'utf8'));
  } else {
    throw new Error('❌ No sample dataset found at bookleaf_sample_data.json or data/bookleaf_sample_data.json');
  }

  const { authors, books } = rawData;
  console.log(`📊 Found ${authors.length} authors and ${books.length} books in dataset.`);

  // 2. Hash default passwords
  const adminPasswordHash = await bcrypt.hash('BookleafAdmin@2026', 10);
  const authorPasswordHash = await bcrypt.hash('AuthorPass@2026', 10);

  // 3. Upsert Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@bookleafpublishing.com' },
    update: {
      name: 'BookLeaf Ops Admin',
      role: 'ADMIN',
      passwordHash: adminPasswordHash,
    },
    create: {
      email: 'admin@bookleafpublishing.com',
      name: 'BookLeaf Ops Admin',
      role: 'ADMIN',
      passwordHash: adminPasswordHash,
      phone: '+91 11 4000 1200',
    },
  });
  console.log(`✅ Admin account ready: ${adminUser.email}`);

  // 4. Upsert Authors and AuthorProfiles
  const authorMap = new Map<string, { userId: string; profileId: string }>();

  for (const a of authors) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: {
        name: a.name,
        role: 'AUTHOR',
        phone: a.phone || null,
      },
      create: {
        email: a.email,
        name: a.name,
        role: 'AUTHOR',
        passwordHash: authorPasswordHash,
        phone: a.phone || null,
      },
    });

    const profile = await prisma.authorProfile.upsert({
      where: { userId: user.id },
      update: {
        authorName: a.name,
        penName: a.penName || null,
        bio: a.bio || null,
        country: a.country || 'India',
        bankAccountLinked: a.bankAccountLinked ?? true,
        bankName: a.bankName || null,
        accountNumberMasked: a.accountNumberMasked || null,
        ifscCode: a.ifscCode || null,
        panMasked: a.panMasked || null,
      },
      create: {
        userId: user.id,
        authorName: a.name,
        penName: a.penName || null,
        bio: a.bio || null,
        country: a.country || 'India',
        bankAccountLinked: a.bankAccountLinked ?? true,
        bankName: a.bankName || null,
        accountNumberMasked: a.accountNumberMasked || null,
        ifscCode: a.ifscCode || null,
        panMasked: a.panMasked || null,
      },
    });

    authorMap.set(a.id, { userId: user.id, profileId: profile.id });
  }
  console.log(`✅ Seeded ${authors.length} authors and author profiles.`);

  // 5. Upsert Books
  const bookMap = new Map<string, string>(); // sourceId -> dbId

  for (const b of books) {
    const authorIds = authorMap.get(b.authorId);
    if (!authorIds) {
      console.warn(`⚠️ Author ${b.authorId} not found for book ${b.title}`);
      continue;
    }

    const pubDate = b.publicationDate ? new Date(b.publicationDate) : null;
    const platformsStr = b.platforms ? JSON.stringify(b.platforms) : JSON.stringify([]);

    const book = await prisma.book.upsert({
      where: { isbn: b.isbn },
      update: {
        title: b.title,
        authorId: authorIds.profileId,
        genre: b.genre,
        publicationDate: pubDate,
        status: b.status,
        productionStage: b.productionStage || null,
        mrp: b.mrp,
        printingCost: b.printingCost ?? 0,
        platformCommission: b.platformCommission ?? 0,
        shippingCharge: b.shippingCharge ?? 0,
        copiesSold: b.copiesSold ?? 0,
        totalRoyaltyEarned: b.totalRoyaltyEarned ?? 0,
        royaltyPaid: b.royaltyPaid ?? 0,
        royaltyPending: b.royaltyPending ?? 0,
        platforms: platformsStr,
        synopsis: b.synopsis || null,
      },
      create: {
        title: b.title,
        authorId: authorIds.profileId,
        isbn: b.isbn,
        genre: b.genre,
        publicationDate: pubDate,
        status: b.status,
        productionStage: b.productionStage || null,
        mrp: b.mrp,
        printingCost: b.printingCost ?? 0,
        platformCommission: b.platformCommission ?? 0,
        shippingCharge: b.shippingCharge ?? 0,
        copiesSold: b.copiesSold ?? 0,
        totalRoyaltyEarned: b.totalRoyaltyEarned ?? 0,
        royaltyPaid: b.royaltyPaid ?? 0,
        royaltyPending: b.royaltyPending ?? 0,
        platforms: platformsStr,
        synopsis: b.synopsis || null,
      },
    });

    bookMap.set(b.id, book.id);
  }
  console.log(`✅ Seeded ${books.length} books.`);

  // 6. Verify counts
  const totalUsers = await prisma.user.count({ where: { role: 'AUTHOR' } });
  const totalBooks = await prisma.book.count();
  const inProductionBooks = await prisma.book.count({ where: { status: 'IN_PRODUCTION' } });

  console.log(`🔍 Verification: ${totalUsers} Authors, ${totalBooks} Books (${inProductionBooks} in production).`);

  // 7. Seed Sample Support Tickets with Public & Private Messages matching PDF examples
  console.log('🎫 Seeding initial support tickets from assignment scenarios...');

  const ticketScenarios = [
    {
      authorKey: 'auth_02', // Anita Nair
      bookKey: 'book_03',   // The Weaver's Corridor
      ticketNumber: 'BL-8401',
      subject: "Royalty not received after 4 months",
      description: "I published my book 4 months ago and still haven't received any royalty payout in my linked account. What is the current status?",
      category: "Royalty & Payments",
      priority: "High",
      status: "IN_PROGRESS",
      aiConfidence: 0.96,
      aiRationale: "Author reports delayed payout over quarterly cycle. Needs verification of bank linkage and quarterly disbursement schedule.",
      aiDraft: "Dear Anita,\n\nThank you for reaching out, and I completely understand your concern regarding your royalty payout.\n\nAt BookLeaf, royalties are calculated on a quarterly basis and disbursed within 45 days after the close of the quarter, provided the accumulated balance meets our minimum threshold of ₹1,000. For 'The Weaver's Corridor', your accumulated pending balance is ₹6,168.00 and your State Bank of India account is linked. We have escalated this to our accounts team to verify the transfer batch, and we will follow up with confirmation within 48 hours.\n\nWarm regards,\nBookLeaf Author Support Team",
      adminNotes: "Internal note: Verified account is linked (SBIN0004567). Q3 payout batch was cleared on the 10th; check with HDFC corporate banking node.",
      publicReply: "Dear Anita,\n\nWe have reviewed your account and confirmed that your pending royalty of ₹6,168.00 has been scheduled with our banking partners. Our finance desk is tracking the transaction reference and we will provide an update within 48 hours.\n\nBest regards,\nBookLeaf Support",
    },
    {
      authorKey: 'auth_01', // Vikram Seth
      bookKey: 'book_01',   // A Monsoon Twilight
      ticketNumber: 'BL-8402',
      subject: "Royalty amount breakdown query",
      description: "My royalty amount seems low for the recent quarter. I sold 200 copies but received ₹3,000 in the last tranche. Could you provide a detailed calculation breakdown?",
      category: "Royalty & Payments",
      priority: "Medium",
      status: "RESOLVED",
      aiConfidence: 0.94,
      aiRationale: "Inquiry regarding net profit calculation (MRP - printing - commission - shipping) and the 80/20 author split.",
      aiDraft: "Dear Vikram,\n\nThank you for writing to us. We believe in 100% transparency with our author partners.\n\nBookLeaf calculates author royalties on an 80/20 net profit split. Net profit is calculated as MRP minus printing costs, channel commissions (e.g. Amazon/Flipkart), and shipping charges. You have earned a total of ₹41,440.00 to date across all tranches, with ₹38,440.00 already paid and ₹3,000.00 pending. We are happy to email your full platform-by-platform sales ledger.\n\nWarm regards,\nBookLeaf Support",
      adminNotes: "Author was satisfied after sharing full CSV platform statement.",
      publicReply: "Dear Vikram,\n\nWe have shared the full line-by-line statement to your registered email address showing sales across Amazon India, Flipkart, and the BookLeaf Store. As discussed, the net profit accurately reflects the 80/20 split after channel logistics fees.\n\nWarm regards,\nBookLeaf Team",
    },
    {
      authorKey: 'auth_04', // Priya Deshmukh
      bookKey: 'book_07',   // The Maratha Fortress
      ticketNumber: 'BL-8403',
      subject: "Incorrect ISBN showing on Amazon listing",
      description: "My book 'The Maratha Fortress' is showing a different ISBN on Amazon India than what is printed on the physical copy back cover.",
      category: "ISBN & Metadata Issues",
      priority: "Critical",
      status: "OPEN",
      aiConfidence: 0.98,
      aiRationale: "ISBN mismatch on public retailer platform. High-priority catalog data issue that requires immediate escalation to production and distribution teams.",
      aiDraft: "Dear Priya,\n\nThank you for bringing this critical issue to our attention immediately. We sincerely apologize for this discrepancy.\n\nAn ISBN mismatch is treated with highest priority at BookLeaf. We have escalated this ticket to our senior catalog and distribution team to cross-verify the metadata feed sent to Amazon India against your official imprint record (978-93-94801-07-4). We will resolve the mapping and provide a confirmed status within 48 hours.\n\nWarm regards,\nBookLeaf Production Team",
      adminNotes: "Catalog sync team notified via Slack #ops-production. Checking Repro data feed.",
      publicReply: null,
    },
    {
      authorKey: 'auth_03', // Rohan Sharma
      bookKey: 'book_06',   // Echoes of the Ghats (In Production)
      ticketNumber: 'BL-8404',
      subject: "Book delayed in typesetting - timeline update needed",
      description: "It has been over 3 weeks and my book 'Echoes of the Ghats' is still showing as in typesetting. When will it move to proofreading?",
      category: "Book Status & Production Updates",
      priority: "Medium",
      status: "OPEN",
      aiConfidence: 0.95,
      aiRationale: "Author seeking update on typesetting production stage. Check typesetting queue and proof delivery schedule.",
      aiDraft: "Dear Rohan,\n\nThank you for checking in on the progress of 'Echoes of the Ghats'. We understand how eagerly you are anticipating the next milestone.\n\nYour book is currently in the typesetting phase, where our editorial team is formatting chapter layouts and heading ornamentation. We are on track to deliver your first digital proof PDF for review by next Tuesday. You will receive an automated email notification the moment the proof is uploaded to your dashboard.\n\nWarm regards,\nBookLeaf Editorial Desk",
      adminNotes: "Typesetter assigned: Ramesh K. Proof draft 1 is 80% done.",
      publicReply: null,
    },
  ];

  for (const s of ticketScenarios) {
    const authorIds = authorMap.get(s.authorKey);
    const bookDbId = s.bookKey ? bookMap.get(s.bookKey) : null;
    if (!authorIds) continue;

    const existing = await prisma.ticket.findUnique({
      where: { ticketNumber: s.ticketNumber },
    });

    if (!existing) {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: s.ticketNumber,
          authorId: authorIds.userId,
          bookId: bookDbId,
          queryType: bookDbId ? 'BOOK_SPECIFIC' : 'GENERAL_ACCOUNT',
          subject: s.subject,
          description: s.description,
          category: s.category,
          priority: s.priority,
          status: s.status,
          aiCategory: s.category,
          aiPriority: s.priority,
          aiConfidence: s.aiConfidence,
          aiRationale: s.aiRationale,
          aiDraft: s.aiDraft,
          aiDraftGeneratedAt: new Date(),
          assignedAdminId: s.status !== 'OPEN' ? adminUser.id : null,
        },
      });

      // Add Author's initial message
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: authorIds.userId,
          senderRole: 'AUTHOR',
          message: s.description,
          isInternalNote: false,
        },
      });

      // Add Internal note (Admin only)
      if (s.adminNotes) {
        await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            senderId: adminUser.id,
            senderRole: 'ADMIN',
            message: s.adminNotes,
            isInternalNote: true, // PRIVATE!
          },
        });
      }

      // Add Public Reply if present
      if (s.publicReply) {
        await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            senderId: adminUser.id,
            senderRole: 'ADMIN',
            message: s.publicReply,
            isInternalNote: false, // PUBLIC!
          },
        });
      }

      // Add activity log
      await prisma.ticketActivity.create({
        data: {
          ticketId: ticket.id,
          actorId: authorIds.userId,
          action: 'CREATED',
          details: JSON.stringify({ subject: s.subject, category: s.category }),
        },
      });
    }
  }

  console.log('✅ Seed completed successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
