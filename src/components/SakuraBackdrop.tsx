import React from 'react';

export const SakuraBackdrop: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none bg-[#fceaf4]"
    >
      <img
        src="/assets/aistudio/ffc5f62bc5688023bde2fd7a819ba48f_e955dce3.jpg"
        alt=""
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
};
