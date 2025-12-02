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
      className="px-4 md:px-6 py-20 md:py-28"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(2rem)',
        transition: 'opacity 1s ease-out, transform 1s ease-out',
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-medium text-primary mb-4">
            Everything you need
          </h2>
        </div>
        <div className="space-y-10 md:space-y-12">
          <FeatureItem 
            icon={<FolderTree className="h-8 w-8" />}
            title="Organize your thoughts"
            description="Create folders and pages in any structure you need. Build your knowledge base the way that makes sense to you."
            delay={0}
            isVisible={isVisible}
          />
          <FeatureItem 
            icon={<FileText className="h-8 w-8" />}
            title="Write naturally"
            description="A rich text editor that works the way you think. Format, structure, and express your ideas without friction."
            delay={150}
            isVisible={isVisible}
          />
          <FeatureItem 
            icon={<Users className="h-8 w-8" />}
            title="Share and collaborate"
            description="Work together in real time. Share pages with your team and see changes as they happen."
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
      className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(1rem)',
        transition: `opacity 0.8s ease-out ${delay}ms, transform 0.8s ease-out ${delay}ms`,
      }}
    >
      <div className="flex-shrink-0">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
      <div className="flex-1 text-center md:text-left">
        <h3 className="font-serif text-xl md:text-2xl font-medium text-primary mb-2">{title}</h3>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

