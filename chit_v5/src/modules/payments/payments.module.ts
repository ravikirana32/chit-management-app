import {
  Body,
  Controller,
  Get,
  Headers,
  Module,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentWorkflowService } from './payment-workflow.service';
import { SubmitPaymentDto } from './dto/submit-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'payments', version: 'v1' })
class PaymentsController {
  constructor(private readonly service: PaymentWorkflowService) {}

  @Get('chits/:chitId/months/:monthId/obligations')
  @ApiOperation({
    summary: 'Get or create contribution obligations for a chit month',
  })
  obligations(
    @Param('chitId') chitId: string,
    @Param('monthId') monthId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.listObligations(chitId, monthId, user.sub);
  }

  // NEW
  @Get('chits/:chitId/months/:monthId')
  @ApiOperation({
    summary: 'List all contribution payments for a chit month',
  })
  payments(
    @Param('chitId') chitId: string,
    @Param('monthId') monthId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.listPayments(chitId, monthId, user.sub);
  }

  @Post('chits/:chitId/participants/:participantId/submit')
  @ApiOperation({ summary: 'Submit contribution payment' })
  submit(
    @Param('chitId') chitId: string,
    @Param('participantId') participantId: string,
    @Body() dto: SubmitPaymentDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentUser() user: any,
  ) {
    return this.service.submit(chitId, participantId, user.sub, {
      ...dto,
      idempotencyKey: idempotencyKey ?? dto.idempotencyKey,
    });
  }

  @Post(':paymentId/verify')
  @ApiOperation({ summary: 'Verify or reject payment' })
  verify(
    @Param('paymentId') paymentId: string,
    @Body() dto: VerifyPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.service.verify(paymentId, user.sub, dto);
  }

  // NEW
  @Post('chits/:chitId/months/:monthId/verify-all')
  @ApiOperation({
    summary: 'Verify all submitted payments for a chit month',
  })
  verifyAll(
    @Param('chitId') chitId: string,
    @Param('monthId') monthId: string,
    @Body() dto: VerifyPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.service.verifyAll(chitId, monthId, user.sub, dto);
  }
}

@Module({
  controllers: [PaymentsController],
  providers: [PaymentWorkflowService],
  exports: [PaymentWorkflowService],
})
export class PaymentsModule {}
