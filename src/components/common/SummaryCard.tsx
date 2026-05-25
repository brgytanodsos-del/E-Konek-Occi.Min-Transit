import React from 'react';

interface SummaryCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  containerClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
  subValueClassName?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ 
    label, 
    value, 
    subValue, 
    containerClassName = 'bg-white', 
    labelClassName = 'text-gray-400',
    valueClassName = 'text-[#003580]',
    subValueClassName = 'text-gray-400'
}) => {
  return (
    <div className={`min-w-[220px] p-5 rounded-2xl border border-gray-100 shadow-sm snap-start flex-1 shrink-0 flex flex-col justify-between ${containerClassName}`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${labelClassName}`}>{label}</p>
      <div>
        <p className={`text-2xl font-black leading-none ${valueClassName}`}>{value}</p>
        {subValue && <p className={`text-[10px] mt-1.5 font-bold uppercase ${subValueClassName}`}>{subValue}</p>}
      </div>
    </div>
  );
};
