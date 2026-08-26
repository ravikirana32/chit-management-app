import { BadRequestException, Injectable } from '@nestjs/common';
import { ChitMonthType } from '../../../common/enums/chit.enums';

@Injectable()
export class ChitConfigurationService {
  validateSchedule(totalMonths: number, months: Array<{monthNumber:number; scheduledAmount:string; monthType:ChitMonthType; agentId?:string}>) {
    if (months.length !== totalMonths) throw new BadRequestException({code:'MONTH_SCHEDULE_INCOMPLETE',message:`Exactly ${totalMonths} monthly entries are required.`});
    const numbers = new Set<number>();
    for (const m of months) {
      if (numbers.has(m.monthNumber)) throw new BadRequestException({code:'DUPLICATE_MONTH_NUMBER',message:`Month ${m.monthNumber} is duplicated.`});
      numbers.add(m.monthNumber);
      if (m.monthNumber < 1 || m.monthNumber > totalMonths) throw new BadRequestException({code:'INVALID_MONTH_NUMBER',message:`Month must be 1-${totalMonths}.`});
      if (!Number.isFinite(Number(m.scheduledAmount)) || Number(m.scheduledAmount) <= 0) throw new BadRequestException({code:'INVALID_MONTHLY_AMOUNT',message:`Month ${m.monthNumber} must have a positive amount.`});
      if (m.monthType === ChitMonthType.AGENT_CHIT && !m.agentId) throw new BadRequestException({code:'AGENT_REQUIRED',message:`Month ${m.monthNumber} requires an agent.`});
      if (m.monthType !== ChitMonthType.AGENT_CHIT && m.agentId) throw new BadRequestException({code:'AGENT_NOT_ALLOWED',message:`Month ${m.monthNumber} cannot contain an agent.`});
    }
  }
}
