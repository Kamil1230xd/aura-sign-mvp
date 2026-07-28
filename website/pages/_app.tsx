import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AnimatePresence, motion } from 'framer-motion';

export default function App({ Component, pageProps, router }: AppProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={router.route}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <Component {...pageProps} />
      </motion.div>
    </AnimatePresence>
  );
}
