import { eq, or } from 'drizzle-orm';
import { db } from './index.ts';
import { credentials, institutions, verificationLogs } from './schema.ts';

export async function getAllCredentials() {
  try {
    return await db.select().from(credentials);
  } catch (error) {
    console.error('Error fetching credentials:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function verifyCredential(searchQuery: string) {
  try {
    const trimmed = searchQuery.trim();
    const results = await db
      .select()
      .from(credentials)
      .where(
        or(
          eq(credentials.documentHash, trimmed),
          eq(credentials.credentialId, trimmed)
        )
      );

    const credential = results[0] || null;

    // Log the verification attempt
    try {
      await db.insert(verificationLogs).values({
        searchQuery: trimmed,
        credentialId: credential ? credential.credentialId : null,
        result: credential ? credential.status : 'NOT_FOUND',
      });
    } catch (logErr) {
      console.warn('Logging verification attempt failed:', logErr);
    }

    return credential;
  } catch (error) {
    console.error('Error verifying credential:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createCredential(data: {
  credentialId: string;
  institutionName: string;
  recipientName: string;
  credentialType: string;
  title: string;
  documentHash: string;
  ipfsCid?: string;
  status?: string;
}) {
  try {
    const inserted = await db
      .insert(credentials)
      .values({
        credentialId: data.credentialId,
        institutionName: data.institutionName,
        recipientName: data.recipientName,
        credentialType: data.credentialType,
        title: data.title,
        documentHash: data.documentHash,
        ipfsCid: data.ipfsCid || null,
        status: data.status || 'VERIFIED',
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Error creating credential:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getAllInstitutions() {
  try {
    return await db.select().from(institutions);
  } catch (error) {
    console.error('Error fetching institutions:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
