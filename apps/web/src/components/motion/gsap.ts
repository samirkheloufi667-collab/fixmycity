import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/** Point d'entrée unique de GSAP : plugins enregistrés une fois (tous gratuits depuis 2025). */
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);
gsap.defaults({ ease: 'expo.out', duration: 1 });

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export { gsap, ScrollTrigger, SplitText, useGSAP };
