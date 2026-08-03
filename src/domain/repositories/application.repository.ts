import { 
  Application, 
  CreateApplicationDto, 
  UpdateApplicationDto, 
  PaginationDto, 
  PaginatedResult, 
  ApplicationEvent 
} from '../models/application';

export interface IApplicationRepository {
  create(data: CreateApplicationDto): Promise<Application>;
  findAll(params?: PaginationDto): Promise<PaginatedResult<Application>>;
  findById(id: string): Promise<Application>;
  update(id: string, data: UpdateApplicationDto): Promise<Application>;
  simulateOffer(id: string, amount: number, termMonths: number): Promise<Application>;
  acceptOffer(id: string): Promise<Application>;
  abandon(id: string, reason: string): Promise<Application>;
  getEvents(id: string): Promise<ApplicationEvent[]>;
  validate(id: string, validationData: any): Promise<any>;
  finalize(id: string, withDisbursement: boolean): Promise<any>;
}
