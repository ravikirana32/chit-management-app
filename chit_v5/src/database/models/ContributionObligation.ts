import { Table, Column, Model, DataType, ForeignKey } from 'sequelize-typescript';
import { ChitMonth } from './ChitMonth';
import { ChitParticipant } from './ChitParticipant';

@Table({ tableName: 'contribution_obligations', underscored: true, timestamps: true })
export class ContributionObligation extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) declare id: string;
  @ForeignKey(() => ChitMonth) @Column({ field: 'chit_month_id', type: DataType.UUID }) declare chitMonthId: string;
  @ForeignKey(() => ChitParticipant) @Column({ field: 'chit_participant_id', type: DataType.UUID }) declare chitParticipantId: string;
  @Column({ field: 'due_amount', type: DataType.DECIMAL(14,2) }) declare dueAmount: string;
  @Column({ field: 'paid_amount', type: DataType.DECIMAL(14,2), defaultValue: 0 }) declare paidAmount: string;
  @Column({ field: 'outstanding_amount', type: DataType.DECIMAL(14,2) }) declare outstandingAmount: string;
  @Column({ type: DataType.STRING(30), defaultValue: 'PENDING' }) declare status: string;
  @Column({ field: 'due_date', type: DataType.DATEONLY }) declare dueDate: string;
}
