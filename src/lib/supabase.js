import { createClient } from "@supabase/supabase-js";

const url = "https://qpcvesdlfqheigbzxbjr.supabase.co";
const key = "sb_publishable_EUGJuOLm-BNO_tT_2S8vew_lwLIyO46";

export const supabase = createClient(url, key);
