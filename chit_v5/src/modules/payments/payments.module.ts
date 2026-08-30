import { Body, Controller, Get, Headers, Module, Param, Post, UseGuards } from '@nestjs/common';
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
    description:
      'Returns the authenticated member obligation, or all active member obligations for the creator. ' +
      'The operation is idempotent and provisions missing obligations from the month scheduled amount.',
  })
  obligations(
    @Param('chitId') chitId: string,
    @Param('monthId') monthId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.listObligations(chitId, monthId, user.sub);
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
    return this.service.submit(chitId, participantId, user.sub, { ...dto, idempotencyKey });
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
}

@Module({
  controllers: [PaymentsController],
  providers: [PaymentWorkflowService],
  exports: [PaymentWorkflowService],
})
export class PaymentsModule {}
