export default {
  background: {
    color: {
      value: "#0f0f23",
    },
    image: "",
    position: "",
    repeat: "",
    size: "",
    opacity: 1,
  },
  fullScreen: {
    enable: true,
    zIndex: -1,
  },
  particles: {
    color: {
      value: "#409eff",
    },
    links: {
      color: {
        value: "#409eff",
      },
      distance: 150,
      enable: true,
      opacity: 0.4,
    },
    move: {
      enable: true,
      speed: 1,
      direction: "none",
      outModes: {
        default: "bounce",
      },
    },
    number: {
      density: {
        enable: true,
        area: 800,
      },
      value: 80,
    },
    opacity: {
      value: 0.5,
    },
    shape: {
      type: "circle",
    },
    size: {
      value: { min: 1, max: 3 },
    },
  },
  interactivity: {
    events: {
      onHover: {
        enable: true,
        mode: "grab",
      },
      onClick: {
        enable: true,
        mode: "push",
      },
    },
    modes: {
      grab: {
        distance: 140,
        links: {
          opacity: 1,
        },
      },
      push: {
        quantity: 4,
      },
    },
  },
};
