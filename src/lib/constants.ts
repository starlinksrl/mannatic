
import { User } from './types';

export const CREATOR_USER_ID = 'user-creator';

export const CREATOR_USER: User = { 
  id: CREATOR_USER_ID, 
  name: 'Creator', 
  email: 'creator@mannatic.com', 
  role: 'Creator', 
  avatarUrl: 'https://i.pravatar.cc/150?u=creator', 
  password: 'Acidosbi74!',
  companyId: 'none'
};
