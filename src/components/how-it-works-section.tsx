"use client";

import { useEffect, useRef, useState } from "react";

export function HowItWorksSection() {
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
      className="px-4 md:px-6 py-20 md:py-28 border-t border-border/40"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(2rem)',
        transition: 'opacity 1s ease-out, transform 1s ease-out',
      }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-medium text-primary mb-3">
            Get started
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Create your workspace and start organizing your thoughts in minutes
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          <StepItem 
            number={1}
            title="Create a workspace"
            description="Sign up and create your first workspace. Give it a name and you're ready to go."
            delay={0}
            isVisible={isVisible}
          />
          <StepItem 
            number={2}
            title="Add pages and folders"
            description="Start writing your first page or create folders to organize your content."
            delay={150}
            isVisible={isVisible}
          />
          <StepItem 
            number={3}
            title="Share and collaborate"
            description="Invite others to your pages and work together in real time."
            delay={300}
            isVisible={isVisible}
          />
        </div>
      </div>
    </section>
  );
}

function StepItem({ 
  number,
  title, 
  description, 
  delay,
  isVisible 
}: { 
  number: number;
  title: string; 
  description: string;
  delay: number;
  isVisible: boolean;
}) {
  return (
    <div 
      className="text-center"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(1rem)',
        transition: `opacity 0.8s ease-out ${delay}ms, transform 0.8s ease-out ${delay}ms`,
      }}
    >
      <div className="flex justify-center mb-4">
        <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-medium">
          {number}
        </div>
      </div>
      <h3 className="font-serif text-lg md:text-xl font-medium text-primary mb-2">{title}</h3>
      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

