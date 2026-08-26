import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User';
import { Chit } from './Chit';

@Table({ tableName: 'chit_participants', underscored: true, timestamps: true })
export class ChitParticipant extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) declare id: string;
  @ForeignKey(() => Chit) @Column({ field: 'chit_id', type: DataType.UUID }) declare chitId: string;
  @ForeignKey(() => User) @Column({ field: 'user_id', type: DataType.UUID }) declare userId: string;
  @BelongsTo(() => Chit, 'chitId') declare chit: Chit;
  @BelongsTo(() => User, 'userId') declare user: User;
  @Column({ field: 'participation_role', type: DataType.STRING(30) }) declare participationRole: string;
  @Column({ type: DataType.STRING(30), defaultValue: 'INVITED' }) declare status: string;
  @Column({ field: 'joined_at', type: DataType.DATE }) declare joinedAt: Date | null;
  @Column({ field: 'accepted_at', type: DataType.DATE }) declare acceptedAt: Date | null;
  @Column({ field: 'exited_at', type: DataType.DATE }) declare exitedAt: Date | null;
  @Column({ field: 'participant_sequence', type: DataType.INTEGER }) declare participantSequence: number;
  @Column(DataType.TEXT) declare notes: string | null;
}
