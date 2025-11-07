import { motion } from "framer-motion";
import bookBg from "@assets/generated_images/Cute_cartoon_book_illustration_43b70df8.png";

interface PageTitleBannerProps {
  title: string;
  subtitle?: string;
  size?: "hero" | "page";
  className?: string;
}

export function PageTitleBanner({ title, subtitle, size = "page", className = "" }: PageTitleBannerProps) {
  const isHero = size === "hero";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative inline-block ${className}`}
      data-testid="page-title-banner"
    >
      <div 
        className={`relative ${isHero ? 'px-12 py-8' : 'px-8 py-4'}`}
        style={{
          backgroundImage: `url(${bookBg})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      >
        <h1 
          className={`${isHero ? 'text-5xl md:text-6xl' : 'text-3xl md:text-4xl'} font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 font-crayon text-center`}
          style={{ textShadow: '0 0 20px rgba(255,255,255,0.8)' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className={`text-center ${isHero ? 'text-lg md:text-xl mt-2' : 'text-base mt-1'} text-gray-700 font-semibold`}>
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
}
