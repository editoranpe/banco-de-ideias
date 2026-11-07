import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const settings = sqliteTable('settings', { key: text('key').primaryKey(), value: text('value').notNull() });
export const members = sqliteTable('members', { email: text('email').primaryKey(), name: text('name').notNull(), active: integer('active').notNull().default(1) });
export const ideas = sqliteTable('ideas', {
 id: text('id').primaryKey(), ownerId: text('owner_id').notNull(), ownerName: text('owner_name').notNull(),
 title: text('title').notNull(), description: text('description').notNull(), links: text('links').notNull().default('[]'),
 answers: text('answers').notNull().default('{}'), scores: text('scores').notNull().default('{}'), sources: text('sources').notNull().default('[]'),
 status: text('status').notNull().default('registered'), archived: integer('archived').notNull().default(0),
 revision: integer('revision').notNull().default(1), prd: text('prd').notNull().default(''), versions: text('versions').notNull().default('[]'),
 approvedRevision: integer('approved_revision'), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull()
});
