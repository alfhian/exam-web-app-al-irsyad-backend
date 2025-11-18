import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ExamStudent } from './entities/exam-student.entity';

@Injectable()
export class ExamStudentsService {
  constructor(
    @InjectRepository(ExamStudent)
    private readonly examStudentRepo: Repository<ExamStudent>,
  ) {}

  async getExamStudents(examId: string) {
    if (!examId) {
      throw new Error('examId wajib diisi');
    }

    return this.examStudentRepo.find({
      where: { exam_id: examId },
      relations: ['student'],
    });
  }
  
  /**
   * Assign students to an exam. studentIds is the full list of selected students for that exam.
   * createdBy is the user id performing the change.
   */
  async assignStudents(examId: string, studentIds: string[], createdBy: string) {
    if (!examId) throw new Error('examId wajib diisi');
    if (!Array.isArray(studentIds)) studentIds = [];

    // unique dan hati-hati dengan tipe
    const uniqStudentIds = Array.from(new Set(studentIds.map((s) => String(s))));

    // transaction supaya konsisten
    return await this.examStudentRepo.manager.transaction(async (manager) => {
      // ambil semua record (termasuk soft-deleted)
      const existingAll: ExamStudent[] = await manager.find(ExamStudent, {
        where: { exam_id: examId },
        withDeleted: true,
      });

      // maps untuk lookup cepat
      const existingByStudent = new Map(existingAll.map((e) => [String(e.student_id), e]));
      const existingActive = existingAll.filter((e) => !e.deleted_at);

      // 1) Insert baru: student id yang tidak pernah ada di tabel exam_students
      const toInsert = uniqStudentIds.filter((id) => !existingByStudent.has(id));

      if (toInsert.length > 0) {
        const rows = toInsert.map((studentId) =>
          manager.create(ExamStudent, {
            exam_id: examId,
            student_id: studentId,
            created_by: createdBy,
          }),
        );
        await manager.save(rows);
      }

      // 2) Restore: jika ada record soft-deleted dan student id muncul di payload → restore
      const toRestoreIds = existingAll
        .filter((e) => e.deleted_at && uniqStudentIds.includes(String(e.student_id)))
        .map((e) => e.id);

      if (toRestoreIds.length > 0) {
        // restore dengan update (set null) agar TypeORM tetap menganggapnya aktif
        await manager
          .createQueryBuilder()
          .update(ExamStudent)
          .set({ deleted_at: null, deleted_by: null })
          .whereInIds(toRestoreIds)
          .execute();
      }

      // 3) Soft-delete: semua record aktif yang tidak ada di payload (uncheck)
      const toSoftDeleteIds = existingActive
        .filter((e) => !uniqStudentIds.includes(String(e.student_id)))
        .map((e) => e.id);

      if (toSoftDeleteIds.length > 0) {
        await manager
          .createQueryBuilder()
          .update(ExamStudent)
          .set({ deleted_at: new Date(), deleted_by: createdBy })
          .whereInIds(toSoftDeleteIds)
          .execute();
      }

      // kembalikan daftar aktif terbaru (tidak termasuk soft-deleted)
      const result = await manager.find(ExamStudent, {
        where: { exam_id: examId },
        relations: ['student'],
      });

      return result;
    });
  }
}
