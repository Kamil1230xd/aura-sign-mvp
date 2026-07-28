import dynamic from 'next/dynamic';
import Head from 'next/head';
import { motion } from 'framer-motion';

// Dynamic import for Hero3D to avoid SSR issues with WebGL
const Hero3D = dynamic(() => import('../components/Hero3D'), { ssr: false });

const features = [
  {
    title: 'TrustMath Engine',
    description: 'Deterministic scoring, incremental processing, real-time metrics.',
    icon: '🔐',
  },
  {
    title: 'Vector Similarity',
    description: 'pgvector + HNSW tuned for scale.',
    icon: '🔍',
  },
  {
    title: 'Enterprise Hardening',
    description: 'Backup, DR, secrets, CI SLSA L3 & audits.',
    icon: '🛡️',
  },
  {
    title: 'Cathedral Architecture',
    description: 'Modular, extensible, and built for the long term.',
    icon: '⛪',
  },
  {
    title: 'Real-time Trust',
    description: 'Dynamic reputation updates with vector intelligence.',
    icon: '⚡',
  },
  {
    title: 'Open Standards',
    description: 'Interoperable with Ethereum, SIWE, and Web3 ecosystem.',
    icon: '🌐',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: 'easeOut',
    },
  }),
};

export default function Home() {
  return (
    <>
      <Head>
        <title>Aura-IDToken — Identity & Trust</title>
        <meta
          name="description"
          content="Aura-IDToken — TrustMath engine, vector similarity and enterprise-grade infrastructure."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
          {/* Hero Section */}
          <div className="mb-12">
            <Hero3D />
          </div>

          {/* Features Grid */}
          <section className="mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl md:text-4xl font-bold text-center mb-12 text-white"
            >
              Built for the Future
            </motion.h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="p-6 bg-white/5 backdrop-blur-sm rounded-xl shadow-lg border border-white/10 hover:border-primary/50 transition-all duration-300"
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="font-semibold text-xl mb-2 text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-300">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-center py-16 px-6 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl backdrop-blur-sm border border-white/10"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Ready to Build Trust?
            </h2>
            <p className="text-lg text-slate-200 mb-8 max-w-2xl mx-auto">
              Join the next generation of identity and reputation systems powered by vector
              intelligence and cryptographic trust.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-primary hover:bg-primary/80 text-white font-semibold rounded-lg shadow-lg transition-all duration-300"
            >
              Get Started
            </motion.button>
          </motion.section>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-white/10 text-center text-slate-400">
            <p className="text-sm">
              © 2024 Aura-IDToken. Built with Next.js, React Three Fiber, and Framer Motion.
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
