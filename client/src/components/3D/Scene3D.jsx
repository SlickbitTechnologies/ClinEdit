import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  OrbitControls,
  Sphere,
  Box,
  Octahedron,
} from "@react-three/drei";
import * as THREE from "three";

// Floating geometric shapes
function FloatingShapes() {
  const groupRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.5} rotationIntensity={1} floatIntensity={0.5}>
        <Box position={[-3, 2, -2]} args={[0.5, 0.5, 0.5]}>
          <meshStandardMaterial color="#14b8a6" opacity={0.7} transparent />
        </Box>
      </Float>

      <Float speed={2} rotationIntensity={1.5} floatIntensity={0.7}>
        <Sphere position={[3, -1, -3]} args={[0.3, 16, 16]}>
          <meshStandardMaterial color="#0d9488" opacity={0.6} transparent />
        </Sphere>
      </Float>

      <Float speed={1.8} rotationIntensity={0.8} floatIntensity={0.6}>
        <Octahedron position={[2, 3, -1]} args={[0.4]}>
          <meshStandardMaterial color="#2dd4bf" opacity={0.8} transparent />
        </Octahedron>
      </Float>

      <Float speed={1.2} rotationIntensity={1.2} floatIntensity={0.4}>
        <Box position={[-2, -2, -4]} args={[0.3, 0.8, 0.3]}>
          <meshStandardMaterial color="#5eead4" opacity={0.5} transparent />
        </Box>
      </Float>
    </group>
  );
}

// Animated particle system
function ParticleField() {
  const meshRef = useRef();
  const particleCount = 50;

  const particles = useMemo(() => {
    const temp = new THREE.Object3D();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }

    return positions;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      meshRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#14b8a6" transparent opacity={0.6} />
    </points>
  );
}

// 3D Logo Icon - Professional Document
function Logo3D() {
  const logoRef = useRef();

  useFrame((state) => {
    if (logoRef.current) {
      logoRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      logoRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group ref={logoRef} position={[0, 0, 0]}>
      {/* Main document body */}
      <Box args={[1.2, 1.6, 0.15]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#ffffff" />
      </Box>

      {/* Document border/frame */}
      <Box args={[1.25, 1.65, 0.12]} position={[0, 0, -0.05]}>
        <meshStandardMaterial color="#14b8a6" />
      </Box>

      {/* Header section */}
      <Box args={[1, 0.25, 0.16]} position={[0, 0.55, 0.01]}>
        <meshStandardMaterial color="#0d9488" />
      </Box>

      {/* Text lines */}
      <Box args={[0.9, 0.08, 0.16]} position={[0, 0.2, 0.01]}>
        <meshStandardMaterial color="#64748b" />
      </Box>
      <Box args={[0.8, 0.08, 0.16]} position={[0, 0.05, 0.01]}>
        <meshStandardMaterial color="#64748b" />
      </Box>
      <Box args={[0.85, 0.08, 0.16]} position={[0, -0.1, 0.01]}>
        <meshStandardMaterial color="#64748b" />
      </Box>
      <Box args={[0.7, 0.08, 0.16]} position={[0, -0.25, 0.01]}>
        <meshStandardMaterial color="#64748b" />
      </Box>

      {/* Signature/approval section */}
      <Box args={[0.4, 0.15, 0.16]} position={[0.3, -0.5, 0.01]}>
        <meshStandardMaterial color="#2dd4bf" />
      </Box>

      {/* Medical/regulatory symbol */}
      <Box args={[0.15, 0.05, 0.17]} position={[-0.4, 0.55, 0.01]}>
        <meshStandardMaterial color="#ffffff" />
      </Box>
      <Box args={[0.05, 0.15, 0.17]} position={[-0.4, 0.55, 0.01]}>
        <meshStandardMaterial color="#ffffff" />
      </Box>

      {/* Corner fold effect */}
      <Box
        args={[0.2, 0.2, 0.14]}
        position={[0.5, 0.7, 0.02]}
        rotation={[0, 0, Math.PI / 4]}
      >
        <meshStandardMaterial color="#f1f5f9" />
      </Box>
    </group>
  );
}

// Feature Card 3D
export function FeatureCard3D({ position = [0, 0, 0] }) {
  const cardRef = useRef();

  useFrame((state) => {
    if (cardRef.current) {
      cardRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      cardRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.1}>
      <group ref={cardRef} position={position}>
        <Box args={[2, 2.5, 0.1]}>
          <meshStandardMaterial color="#ffffff" opacity={0.9} transparent />
        </Box>
        <Box args={[0.5, 0.5, 0.2]} position={[0, 0.8, 0.1]}>
          <meshStandardMaterial color="#14b8a6" />
        </Box>
      </group>
    </Float>
  );
}

// Main 3D Scene component
export default function Scene3D({
  className = "",
  showLogo = false,
  showFeatureCards = false,
}) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        {showLogo && <Logo3D />}

        {showFeatureCards && (
          <>
            <FeatureCard3D position={[-3, 0, -2]} />
            <FeatureCard3D position={[3, 0, -2]} />
            <FeatureCard3D position={[0, -2, -2]} />
          </>
        )}

        <FloatingShapes />
        <ParticleField />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          enableDamping
        />
      </Canvas>
    </div>
  );
}
