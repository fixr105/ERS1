import { NoiseBackground } from '@/components/ui/noise-background';

export default function NoiseBackgroundDemo() {
  return (
    <div className="flex justify-center">
      <NoiseBackground
        containerClassName="w-fit p-2 rounded-full mx-auto"
        gradientColors={[
          'rgb(255, 100, 150)',
          'rgb(100, 150, 255)',
          'rgb(255, 200, 100)',
        ]}
      >
        <button className="h-full w-full cursor-pointer rounded-full bg-gradient-to-r from-neutral-100 via-neutral-100 to-white px-4 py-2 text-black shadow-[0px_2px_0px_0px_#fafafa_inset,0px_0.5px_1px_0px_#a3a3a3] transition-all duration-100 active:scale-[0.98] dark:from-black dark:via-black dark:to-neutral-900 dark:text-white dark:shadow-[0px_1px_0px_0px_#0a0a0a_inset,0px_1px_0px_0px_#262626]">
          Start publishing &rarr;
        </button>
      </NoiseBackground>
    </div>
  );
}
