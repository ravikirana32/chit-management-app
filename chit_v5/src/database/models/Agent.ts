import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './User';
import { ChitMonth } from './ChitMonth';

@Table({ tableName: 'agents', underscored: true, timestamps: true })
export class Agent extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) declare id: string;
  @ForeignKey(() => User) @Column({ field: 'user_id', type: DataType.UUID }) declare userId: string | null;
  @BelongsTo(() => User, 'userId') declare user: User | null;
  @Column(DataType.STRING(150)) declare name: string;
  @Column(DataType.STRING(20)) declare mobile: string | null;
  @Column({ field: 'upi_id', type: DataType.STRING(255) }) declare upiId: string | null;
  @Column({ type: DataType.STRING(30), defaultValue: 'ACTIVE' }) declare status: string;
  @Column(DataType.TEXT) declare notes: string | null;
  @HasMany(() => ChitMonth, 'agentId') declare chitMonths: ChitMonth[];
}
