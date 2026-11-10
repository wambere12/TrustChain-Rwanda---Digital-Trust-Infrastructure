import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. Users table (Firebase Auth linked)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  role: text('role').notNull().default('citizen'), // 'citizen', 'issuer', 'admin'
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Accredited Institutions
export const institutions = pgTable('institutions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  publicKey: text('public_key').notNull(),
  isAccredited: boolean('is_accredited').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Citizens
export const citizens = pgTable('citizens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  nationalIdHash: text('national_id_hash').notNull(),
  didIdentifier: text('did_identifier').notNull().unique(),
  walletAddress: text('wallet_address').notNull(),
  fullName: text('full_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Verifiable Credentials
export const credentials = pgTable('credentials', {
  id: serial('id').primaryKey(),
  credentialId: text('credential_id').notNull().unique(),
  institutionId: integer('institution_id').references(() => institutions.id),
  citizenId: integer('citizen_id').references(() => citizens.id),
  institutionName: text('institution_name').notNull(),
  recipientName: text('recipient_name').notNull(),
  credentialType: text('credential_type').notNull(),
  title: text('title').notNull(),
  documentHash: text('document_hash').notNull(),
  ipfsCid: text('ipfs_cid'),
  status: text('status').notNull().default('VERIFIED'),
  issuedAt: timestamp('issued_at').defaultNow(),
});

// 5. Verification Audit Logs
export const verificationLogs = pgTable('verification_logs', {
  id: serial('id').primaryKey(),
  searchQuery: text('search_query').notNull(),
  credentialId: text('credential_id'),
  result: text('result').notNull(),
  verifiedAt: timestamp('verified_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  citizens: many(citizens),
}));

export const citizensRelations = relations(citizens, ({ one, many }) => ({
  user: one(users, {
    fields: [citizens.userId],
    references: [users.id],
  }),
  credentials: many(credentials),
}));

export const institutionsRelations = relations(institutions, ({ many }) => ({
  credentials: many(credentials),
}));

export const credentialsRelations = relations(credentials, ({ one }) => ({
  institution: one(institutions, {
    fields: [credentials.institutionId],
    references: [institutions.id],
  }),
  citizen: one(citizens, {
    fields: [credentials.citizenId],
    references: [citizens.id],
  }),
}));
