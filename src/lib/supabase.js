import { createClient } from '@supabase/supabase-js';
import { CFG, MODO_REAL } from '../config.js';

export const supabase = MODO_REAL ? createClient(CFG.supabaseUrl, CFG.supabaseKey) : null;
