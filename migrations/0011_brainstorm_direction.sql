-- Brainstorm sessions track an evolving "direction" (working title + bullets)
-- of the details the author has agreed on, used to build the book.
ALTER TABLE "BrainstormSession" ADD COLUMN "directionJson" TEXT NOT NULL DEFAULT '';
