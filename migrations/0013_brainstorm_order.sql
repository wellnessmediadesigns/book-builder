-- Manual ordering for brainstorm sessions (reorder up/down in the list).
ALTER TABLE "BrainstormSession" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
