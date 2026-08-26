import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Chit } from './Chit';
import { Agent } from './Agent';

@Table({ tableName: 'chit_months', underscored: true, timestamps: true })
export class ChitMonth extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) declare id: string;
  @ForeignKey(() => Chit) @Column({ field: 'chit_id', type: DataType.UUID }) declare chitId: string;
  @BelongsTo(() => Chit, 'chitId') declare chit: Chit;
  @Column({ field: 'month_number', type: DataType.INTEGER }) declare monthNumber: number;
  @Column({ field: 'scheduled_date', type: DataType.DATEONLY }) declare scheduledDate: string;
  @Column({ field: 'scheduled_amount', type: DataType.DECIMAL(14,2) }) declare scheduledAmount: string;
  @Column({ field: 'month_type', type: DataType.STRING(20), defaultValue: 'ACTION' }) declare monthType: string;
  @Column({ type: DataType.STRING(30), defaultValue: 'SCHEDULED' }) declare status: string;
  @ForeignKey(() => Agent) @Column({ field: 'agent_id', type: DataType.UUID }) declare agentId: string | null;
  @BelongsTo(() => Agent, 'agentId') declare agent: Agent | null;
  @Column({ field: 'published_locked_at', type: DataType.DATE }) declare publishedLockedAt: Date | null;
}
