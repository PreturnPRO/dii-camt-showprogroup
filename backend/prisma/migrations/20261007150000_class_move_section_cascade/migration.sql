-- a removed section takes its move history with it; sections with moves still waiting or in effect are refused by updateCourse
ALTER TABLE "ClassMove" DROP CONSTRAINT "ClassMove_sectionId_fkey";
ALTER TABLE "ClassMove" ADD CONSTRAINT "ClassMove_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
