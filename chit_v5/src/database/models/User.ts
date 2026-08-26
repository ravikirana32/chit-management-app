import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { Chit } from './Chit';
import { ChitParticipant } from './ChitParticipant';

@Table({ tableName: 'users', underscored: true, timestamps: true })
export class User extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) declare id: string;
  @Column({ field: 'mobile_country_code', type: DataType.STRING(8) }) declare mobileCountryCode: string;
  @Column({ field: 'mobile_number', type: DataType.STRING(20) }) declare mobileNumber: string;
  @Column({ field: 'normalized_mobile', type: DataType.STRING(25), unique: true }) declare normalizedMobile: string;
  @Column(DataType.STRING(150)) declare name: string;
  @Column(DataType.STRING(255)) declare email: string | null;
  @Column({ field: 'profile_photo_url', type: DataType.TEXT }) declare profilePhotoUrl: string | null;
  @Column(DataType.STRING(30)) declare status: string;
  @Column({ field: 'preferred_language', type: DataType.STRING(10), defaultValue: 'en' }) declare preferredLanguage: string;
  @Column({ type: DataType.STRING(64), defaultValue: 'Asia/Kolkata' }) declare timezone: string;
  @Column({ field: 'last_login_at', type: DataType.DATE }) declare lastLoginAt: Date | null;
  @HasMany(() => Chit, 'creatorId') declare createdChits: Chit[];
  @HasMany(() => ChitParticipant, 'userId') declare chitParticipations: ChitParticipant[];
}
