import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	role: text('role').notNull(),
	cpr: text('cpr'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const patients = pgTable('patients', {
	id: serial('id').primaryKey(),
	cpr: text('cpr').notNull().unique(),
	name: text('name').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const appointments = pgTable('appointments', {
	id: serial('id').primaryKey(),
	cpr: text('cpr').notNull(),
	date: text('date').notNull(),
	time: text('time'),
	title: text('title').notNull(),
	location: text('location'),
	status: text('status').default('kommende').notNull(),
	visitSummary: text('visit_summary'),
	journalNote: text('journal_note'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const labResults = pgTable('lab_results', {
	id: serial('id').primaryKey(),
	cpr: text('cpr').notNull(),
	title: text('title').notNull(),
	result: text('result'),
	referenceRange: text('reference_range'),
	assessment: text('assessment'),
	date: text('date').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const questionnaires = pgTable('questionnaires', {
	id: serial('id').primaryKey(),
	cpr: text('cpr').notNull(),
	title: text('title').notNull(),
	status: text('status').default('ny').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const patientTasks = pgTable('patient_tasks', {
	id: serial('id').primaryKey(),
	cpr: text('cpr').notNull(),
	title: text('title').notNull(),
	dueDate: text('due_date').notNull(),
	note: text('note'),
	isDone: boolean('is_done').default(false).notNull(),

	submissionComment: text('submission_comment'),
	submittedFileName: text('submitted_file_name'),
	submittedAt: timestamp('submitted_at'),

	doctorReply: text('doctor_reply'),
	doctorRepliedAt: timestamp('doctor_replied_at'),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const bookingRequests = pgTable('booking_requests', {
	id: serial('id').primaryKey(),
	cpr: text('cpr').notNull(),
	appointmentType: text('appointment_type').notNull(),
	preferredDate: text('preferred_date'),
	preferredTime: text('preferred_time'),
	comment: text('comment'),
	attachedFileName: text('attached_file_name'),
	status: text('status').default('afventer').notNull(),
	appointmentId: integer('appointment_id'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});