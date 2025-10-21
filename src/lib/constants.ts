
import { User } from './types';

// This constant is now deprecated and will be removed in a future version.
// Creator users are now managed in the database.
export const CREATOR_USER_ID = 'user-creator-main';

export const CREATOR_USER: User = { 
  id: CREATOR_USER_ID, 
  name: 'Main Creator', 
  email: 'creator@mannatic.com', 
  role: 'Creator', 
  avatarUrl: 'https://i.pravatar.cc/150?u=creator', 
  password: 'Acidosbi74!',
  companyId: 'none'
};
