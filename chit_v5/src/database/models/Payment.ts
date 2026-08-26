import { Table, Column, Model, DataType, ForeignKey } from 'sequelize-typescript';
import { Chit } from './Chit';
import { ChitMonth } from './ChitMonth';
import { ChitParticipant } from './ChitParticipant';
import { ContributionObligation } from './ContributionObligation';

@Table({ tableName: 'payments', underscored: true, timestamps: true })
export class Payment extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) declare id: string;
  @ForeignKey(() => Chit) @Column({ field: 'chit_id', type: DataType.UUID }) declare chitId: string;
  @ForeignKey(() => ChitMonth) @Column({ field: 'chit_month_id', type: DataType.UUID }) declare chitMonthId: string;
  @ForeignKey(() => ChitParticipant) @Column({ field: 'chit_participant_id', type: DataType.UUID }) declare chitParticipantId: string;
  @ForeignKey(() => ContributionObligation) @Column({ field: 'obligation_id', type: DataType.UUID }) declare obligationId: string;
  @Column({ type: DataType.DECIMAL(14,2) }) declare amount: string;
  @Column({ field: 'payment_method', type: DataType.STRING(30) }) declare paymentMethod: string;
  @Column({ type: DataType.STRING(30), defaultValue: 'SUBMITTED' }) declare status: string;
  @Column({ field: 'transaction_reference', type: DataType.STRING(255) }) declare transactionReference: string | null;
  @Column({ field: 'payment_date', type: DataType.DATE }) declare paymentDate: Date;
  @Column({ field: 'submitted_at', type: DataType.DATE }) declare submittedAt: Date | null;
  @Column({ field: 'verified_at', type: DataType.DATE }) declare verifiedAt: Date | null;
  @Column({ field: 'recorded_by', type: DataType.UUID }) declare recordedBy: string;
  @Column({ field: 'verified_by', type: DataType.UUID }) declare verifiedBy: string | null;
  @Column(DataType.TEXT) declare notes: string | null;
  @Column({ field: 'receipt_number', type: DataType.STRING(100) }) declare receiptNumber: string | null;
}
