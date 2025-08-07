import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  phone: string;

  @Column()
  chart: string;

  @Column()
  rrm?: string; // 주민등록번호

  @Column()
  address?: string;

  @Column()
  memo?: string;

  @Column()
  rowNum?: number;

  @Column()
  fileName?: string;
}
