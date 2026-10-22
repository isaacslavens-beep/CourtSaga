// Highlights on YouTube for some well-known matches, by the sample log's id and the match data's id, so a
// fan who logs one of them gets the same video. Checked against YouTube's oEmbed data (title and channel)
// on 18 October 2026; the tournaments' own, Tennis TV and broadcasters. Everything else links to a search.

const videos: [sample: string, data: string | null, video: string][] = [
  ["wim08", "atp_2008-540_F_N409_F324", "U5Af1jGgYqA"], // Wimbledon: Best Rallies
  ["ao12", "atp_2012-580_F_D643_N409", "4Nk_whncZ20"], // Australian Open: Extended Highlights
  ["wim19", "atp_2019-540_F_D643_F324", "gFQ4xPfJ5pY"], // ESPN: 2019 Wimbledon Highlights
  ["wim22", "atp_2022-540_R16_S0AG_A0E2", "hR11Emi6KCw"], // Wimbledon: Sinner Overcomes Alcaraz
  ["wim22w", "wta_2022-904_F_214981_202460", "BzkN0Yfoyh0"], // Wimbledon: Ladies' Singles Final Highlights
  ["uso22", "atp_2022-560_QF_A0E2_S0AG", "-SSd4pFPUXk"], // US Open: Extended Highlights
  ["ao23w", "wta_2023-901_F_214544_214981", "RZYrEiyPGuE"], // Australian Open: Extended Highlights
  ["rg23", "atp_2023-520_SF_D643_A0E2", "JjbWqtnAbxY"], // "Djokovic vs Alcaraz Semi-final Highlights | Roland-Garros 2023"
  ["wim23", "atp_2023-540_F_A0E2_D643", "dvBr9Wr8BCY"], // Wimbledon: Extended Highlights
  ["cin23", "atp_2023-422_F_D643_A0E2", "QTEqmACEuTI"], // Tennis TV: Cincinnati 2023 Final Highlights
  ["ao24sf", "atp_2024-580_SF_S0AG_D643", "d8ICgsnZHrU"], // Australian Open: Extended Highlights
  ["ao24f", "atp_2024-580_F_S0AG_MM58", "b90INDbXX7Y"], // Australian Open: Extended Highlights
  ["iw24", "atp_2024-404_SF_A0E2_S0AG", "P3eXD15w7So"], // Tennis TV: Extended Highlights
  ["rg24sf", "atp_2024-520_SF_A0E2_S0AG", "ZKAexfNzwh0"], // Roland-Garros: Semi-final Highlights
  ["wim24", "atp_2024-540_F_A0E2_D643", "64WsO9LKE-A"], // Wimbledon: Final Extended Highlights
  ["oly24", "atp_2024-96_F_D643_A0E2", "s2hVlbNadCc"], // "Novak Djokovic wins gold in Men's Tennis Singles | Paris 2024 Highlights"
  ["bei24", "atp_2024-747_F_A0E2_S0AG", "UL7r13j1sLs"], // Tennis TV: Beijing Final Extended Highlights
  ["ao25f", "atp_2025-580_F_S0AG_Z355", "F5B1QpU0Evo"], // Australian Open: Extended Highlights
  ["rom25", "atp_2025-416_F_A0E2_S0AG", "m-p9LA0aQHk"], // Sky Sport Tennis: Finale highlights (Italian commentary)
  ["rg25", "atp_2025-520_F_A0E2_S0AG", "L63N1y5BnfY"], // Roland-Garros: extended highlights
  ["wim25", "atp_2025-540_F_S0AG_A0E2", "eRbTHj2KLro"], // Wimbledon: Highlights
  ["uso25sf", "atp_2025-560_SF_A0E2_D643", "91QiqjXzBdc"], // US Open: Extended Highlights
  ["uso25", "atp_2025-560_F_A0E2_S0AG", "DHo1mw7lj3s"], // US Open: Extended Highlights
  // The sample's 2026 matches, not in the match data yet
  ["ao26", null, "Z99RntcbEtY"], // Australian Open: Extended Highlights
  ["wim26sf", null, "pgFm3YBU9_E"], // Wimbledon: Extended Highlights
  ["wim26f", null, "t88oAZbdtX8"], // Wimbledon: Extended Highlights
  ["uso26qf", null, "rzQK-peqhJw"], // US Open: Extended Highlights
  ["uso26w", null, "47hMZmSQO2I"], // US Open: Extended Highlights
];

export const highlightVideos: Record<string, string> = Object.fromEntries(
  videos.flatMap(([sample, data, video]) => [[sample, video], ...(data ? [[data, video]] : [])]),
);

/** The same match in the sample log and in the match data, for the few with photos */
export const sameMatch: Record<string, string> = { "atp_2025-540_F_S0AG_A0E2": "wim25" };
