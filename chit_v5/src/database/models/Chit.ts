import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './User';
import { ChitParticipant } from './ChitParticipant';
import { ChitMonth } from './ChitMonth';

@Table({ tableName: 'chits', underscored: true, timestamps: true })
export class Chit extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) declare id: string;
  @ForeignKey(() => User) @Column({ field: 'creator_id', type: DataType.UUID }) declare creatorId: string;
  @BelongsTo(() => User, 'creatorId') declare creator: User;
  @Column(DataType.STRING(200)) declare name: string;
  @Column(DataType.TEXT) declare description: string | null;
  @Column({ field: 'chit_type', type: DataType.STRING(30) }) declare chitType: string;
  @Column({ type: DataType.STRING(40), defaultValue: 'DRAFT' }) declare status: string;
  @Column({ field: 'total_members', type: DataType.INTEGER }) declare totalMembers: number;
  @Column({ field: 'total_months', type: DataType.INTEGER }) declare totalMonths: number;
  @Column({ type: DataType.STRING(3), defaultValue: 'INR' }) declare currency: string;
  @Column({ field: 'start_date', type: DataType.DATEONLY }) declare startDate: string;
  @Column({ field: 'due_day', type: DataType.SMALLINT }) declare dueDay: number;
  @Column({ type: DataType.STRING(64), defaultValue: 'Asia/Kolkata' }) declare timezone: string;
  @Column({ field: 'creator_participates', type: DataType.BOOLEAN, defaultValue: false }) declare creatorParticipates: boolean;
  @Column({ field: 'published_at', type: DataType.DATE }) declare publishedAt: Date | null;
  @Column({ field: 'started_at', type: DataType.DATE }) declare startedAt: Date | null;
  @Column({ field: 'completed_at', type: DataType.DATE }) declare completedAt: Date | null;
  @Column({ type: DataType.INTEGER, defaultValue: 1 }) declare version: number;
  @HasMany(() => ChitParticipant, 'chitId') declare participants: ChitParticipant[];
  @HasMany(() => ChitMonth, 'chitId') declare months: ChitMonth[];
}
