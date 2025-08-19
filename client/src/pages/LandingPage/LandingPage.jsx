
import { useNavigate } from "react-router-dom";
import { getIdToken } from "firebase/auth";

import { auth, provider, signInWithPopup } from "../../firebase";



import Scene3D from "../../components/3D/Scene3D";
import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Edit3, FileText, Download, CheckCircle, Zap } from "lucide-react";
import "./LandingPage.css";

export default function LandingPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);
    const navigate = useNavigate();



  const handleGoogleSignIn = async () => {
    try {
       const result = await signInWithPopup(auth, provider);
       const user = result.user;
       const token = await getIdToken(user);

       localStorage.setItem("accessToken", token);
       localStorage.setItem("user", JSON.stringify(user));

       navigate("/dashboard");
     } catch (error) {
       console.error("Google Sign-In Error:", error);
       alert("Google Sign-In failed. Check your Firebase config.");
     }
  };




  const features = [
    {
      icon: Edit3,
      title: "Rich Text Editor",
      description: "Google Docs-like editing experience with professional formatting",
    },
    {
      icon: Shield,
      title: "Real-time Validation",
      description: "Continuous compliance checking against regulatory standards",
    },
    {
      icon: FileText,
      title: "Export & Reports",
      description: "Generate final documents and compliance reports",
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="landing-page">
      {/* 3D Background */}
      <Scene3D className="scene-3d-background" />

      {/* Header Section */}
      <motion.div
        className="hero-section"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className="hero-content"
          variants={itemVariants}
        >
          {/* 3D Logo/Icon */}
          <motion.div
            className="logo-3d-container"
            variants={itemVariants}
          >
            <Scene3D className="logo-3d-scene" showLogo={true} />
          </motion.div>

          {/* Main Heading */}
          <motion.h1 
            className="main-heading"
            variants={itemVariants}
          >
            Clinical Regulatory
            <br />
            <span className="heading-highlight">Document Editor</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            className="subtitle"
            variants={itemVariants}
          >
            AI-powered platform for creating, editing, and validating clinical
            regulatory documents. Ensure compliance with global standards.
          </motion.p>

          {/* Feature Chips */}
          <motion.div 
            className="feature-chips"
            variants={itemVariants}
          >
            <div className="feature-chip">
              <CheckCircle className="chip-icon" />
              Real-time Validation
            </div>
            <div className="feature-chip">
              <Shield className="chip-icon" />
              Compliance Tracking
            </div>
            <div className="feature-chip">
              <Download className="chip-icon" />
              Export Ready
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div variants={itemVariants}>
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="cta-button"
            >
              {isSigningIn ? (
                <>
                  <div className="loading-spinner"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="google-icon" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign In with Google
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Platform Features Section */}
      <motion.div
        className="features-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        {/* 3D Features Background */}
        <Scene3D className="features-3d-background" showFeatureCards={true} />

        <div className="features-container">
          <motion.div 
            className="features-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="features-title">
              Platform Features
            </h2>
            <p className="features-description">
              Everything you need to create, validate, and export regulatory documents with confidence
            </p>
          </motion.div>

          <div className="features-grid">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                >
                  <div className="feature-card">
                    <div className="feature-card-content">
                      <motion.div 
                        className="feature-icon-container"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <IconComponent className="feature-icon" />
                      </motion.div>
                      <h3 className="feature-card-title">
                        {feature.title}
                      </h3>
                      <p className="feature-card-description">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Additional Benefits Section */}
      <motion.div 
        className="cta-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="cta-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="cta-title">
              Ready to Streamline Your Regulatory Workflow?
            </h2>
            <p className="cta-description">
              Join thousands of regulatory professionals who trust our platform for their document creation and validation needs.
            </p>
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="cta-secondary-button"
            >
              <Zap className="cta-icon" />
              Get Started Today
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
