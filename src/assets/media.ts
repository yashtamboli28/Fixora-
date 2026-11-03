import heroTechnicianPhoto from './images/hero_indian_repair_tech_1793729998708.jpg';
import mobileRepairServicePhoto from './images/service_mobile_repair_1793729998745.jpg';
import laptopRepairServicePhoto from './images/service_laptop_repair_1793730000889.jpg';
import maleTechPortrait from './images/avatar_tech_male_1_1793730001953.jpg';
import femaleTechPortrait from './images/avatar_tech_female_1_1793730001984.jpg';

export const MARKETPLACE_MEDIA = {
  heroTechnicianPhoto,
  mobileRepairServicePhoto,
  laptopRepairServicePhoto,
  maleTechPortrait,
  femaleTechPortrait,
};

export function resolveTechnicianPhotoUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  if (rawUrl === 'preset:male_tech') return maleTechPortrait;
  if (rawUrl === 'preset:female_tech') return femaleTechPortrait;
  return rawUrl;
}
