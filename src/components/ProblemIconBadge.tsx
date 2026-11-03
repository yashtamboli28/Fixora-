import React from 'react';
import {
  Battery,
  Camera,
  Cpu,
  Gauge,
  HardDrive,
  Keyboard,
  Mic,
  Monitor,
  Plug,
  Power,
  Smartphone,
  Wrench,
} from 'lucide-react';

interface ProblemIconBadgeProps {
  problem: string;
}

export const ProblemIconBadge: React.FC<ProblemIconBadgeProps> = ({ problem }) => {
  const normalized = problem.toLowerCase();

  let IconComponent = Wrench;

  if (normalized.includes('screen')) {
    IconComponent = Smartphone;
  } else if (normalized.includes('display')) {
    IconComponent = Monitor;
  } else if (normalized.includes('battery')) {
    IconComponent = Battery;
  } else if (normalized.includes('charging')) {
    IconComponent = Plug;
  } else if (normalized.includes('speaker') || normalized.includes('microphone')) {
    IconComponent = Mic;
  } else if (normalized.includes('keyboard')) {
    IconComponent = Keyboard;
  } else if (normalized.includes('hardware')) {
    IconComponent = HardDrive;
  } else if (normalized.includes('software') || normalized.includes('operating system')) {
    IconComponent = Cpu;
  } else if (normalized.includes('turning on') || normalized.includes('power')) {
    IconComponent = Power;
  } else if (normalized.includes('camera')) {
    IconComponent = Camera;
  } else if (normalized.includes('performance')) {
    IconComponent = Gauge;
  }

  return (
    <span className="w-11 h-11 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0">
      <IconComponent className="w-5 h-5" />
    </span>
  );
};
