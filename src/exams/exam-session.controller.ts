import { Controller, Post, Param, UploadedFiles, Body, Req, BadRequestException, UseGuards, UseInterceptors,
  UploadedFile } from '@nestjs/common';
import { ExamSessionService } from './exam-session.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';


@Controller('exam-sessions')
@UseGuards(AuthGuard('jwt'))
export class ExamSessionController {
  constructor(private readonly examSessionService: ExamSessionService) {}

  // @UseInterceptors(FileInterceptor('file'))
  // @Post(':id/upload-video')
  // async uploadVideo(
  //   @Param('id') sessionId: string,
  //   @UploadedFile() file: Multer.File,
  // ) {
  //   if (!file) {
  //     throw new BadRequestException('File rekaman tidak ditemukan');
  //   }

  //   return this.examSessionService.uploadVideo(sessionId, file);
  // }

  @Post(':sessionId/upload-video')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    return this.examSessionService.uploadVideo(sessionId, file, req.user);
  }

  // @Post(':id/upload-video')
  // @UseInterceptors(FileInterceptor('file'))
  // async uploadVideo(
  //   @Param('id') sessionId: string,
  //   @UploadedFile() file: File,
  // ) {
  //   return this.examSessionService.uploadVideo(sessionId, file);
  // }

  @Post(':examId/start')
  async startSession(@Param('examId') examId: string, @Req() req: any) {
    const studentId = req.user?.sub;
    if (!studentId) throw new BadRequestException('User not authenticated');

    return this.examSessionService.startSession(examId, studentId);
  }

  @Post(':sessionId/tab-switch')
  async incrementTabSwitch(@Param('sessionId') sessionId: string) {
    return this.examSessionService.incrementTabSwitch(sessionId);
  }

  @Post(':sessionId/finish')
  async finishSession(@Param('sessionId') sessionId: string) {
    return this.examSessionService.finishSession(sessionId);
  }
}
