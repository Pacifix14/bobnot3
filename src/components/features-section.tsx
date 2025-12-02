"use client";

import { useEffect, useRef, useState } from "react";
import { FolderTree, Users, FileText } from "lucide-react";

export function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -100px 0px",
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="px-4 md:px-6 py-24 md:py-32 lg:py-40"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(2rem)',
        transition: 'opacity 1s ease-out, transform 1s ease-out',
      }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          <FeatureItem 
            icon={<FolderTree className="h-6 w-6" />}
            title="Organize"
            description="Folders and pages in any structure you need."
            delay={0}
            isVisible={isVisible}
          />
          <FeatureItem 
            icon={<FileText className="h-6 w-6" />}
            title="Write"
            description="Rich text editor that works the way you think."
            delay={150}
            isVisible={isVisible}
          />
          <FeatureItem 
            icon={<Users className="h-6 w-6" />}
            title="Share"
            description="Work together in real time."
            delay={300}
            isVisible={isVisible}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureItem({ 
  icon, 
  title, 
  description, 
  delay,
  isVisible 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  delay: number;
  isVisible: boolean;
}) {
  return (
    <div 
      className="text-center space-y-3"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(1rem)',
        transition: `opacity 0.8s ease-out ${delay}ms, transform 0.8s ease-out ${delay}ms`,
      }}
    >
      <div className="flex justify-center mb-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
      <h3 className="font-serif text-xl md:text-2xl font-medium text-primary">{title}</h3>
      <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xs mx-auto">{description}</p>
    </div>
  );
}

