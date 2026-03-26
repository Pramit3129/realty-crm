export const INBUILT_TEMPLATES = [
  {
    id: "inbuilt-welcome",
    name: "Welcome Email",
    design: {
      body: {
        rows: [
          {
            cells: [1],
            columns: [
              {
                contents: [
                  {
                    type: "heading",
                    values: {
                      headingType: "h1",
                      text: "Welcome to Our Community!",
                      textAlign: "center"
                    }
                  },
                  {
                    type: "text",
                    values: {
                      text: "<p style=\"text-align: center; font-size: 16px;\">We are absolutely thrilled to have you here. Let's get started with your first quick step.</p>"
                    }
                  },
                  {
                    type: "button",
                    values: {
                      text: "Get Started Now",
                      textAlign: "center",
                      backgroundColor: "#3b82f6",
                      borderRadius: "6px",
                      paddingTop: "10px",
                      paddingBottom: "10px",
                      paddingRight: "20px",
                      paddingLeft: "20px"
                    }
                  }
                ]
              }
            ],
            values: {
              backgroundColor: "#ffffff",
              padding: "20px"
            }
          }
        ],
        values: {
          backgroundColor: "#f3f4f6"
        }
      }
    }
  },
  {
    id: "inbuilt-newsletter",
    name: "Monthly Newsletter",
    design: {
      body: {
        rows: [
          {
            cells: [1],
            columns: [
              {
                contents: [
                  {
                    type: "heading",
                    values: {
                      headingType: "h2",
                      text: "Your Monthly Update",
                      textAlign: "left"
                    }
                  },
                  {
                    type: "text",
                    values: {
                      text: "<p>Here is what you missed this month. We have shipped 3 new features, written 2 new blog posts, and squashed 14 bugs!</p>"
                    }
                  },
                  {
                    type: "divider",
                    values: {
                      width: "100%",
                      lineStyle: "solid",
                      lineWidth: "1px",
                      lineColor: "#e5e7eb"
                    }
                  },
                  {
                    type: "text",
                    values: {
                      text: "<h3>Spotlight Feature</h3><p>Our completely revamped analytics dashboard is now live.</p>"
                    }
                  }
                ]
              }
            ],
            values: {
              backgroundColor: "#ffffff",
              padding: "20px"
            }
          }
        ],
        values: {
          backgroundColor: "#f9fafb"
        }
      }
    }
  },
  {
    id: "inbuilt-promo",
    name: "Promotional Offer",
    design: {
      body: {
        rows: [
          {
            cells: [1],
            columns: [
              {
                contents: [
                  {
                    type: "heading",
                    values: {
                      headingType: "h1",
                      text: "Limited Time Offer! 🎉",
                      textAlign: "center",
                      color: "#dc2626"
                    }
                  },
                  {
                    type: "text",
                    values: {
                      text: "<p style=\"text-align: center; font-size: 18px;\">Get 50% off on your next billing cycle if you upgrade today.</p>"
                    }
                  },
                  {
                    type: "button",
                    values: {
                      text: "Claim Your 50% Off",
                      textAlign: "center",
                      backgroundColor: "#dc2626",
                      borderRadius: "8px",
                      paddingTop: "15px",
                      paddingBottom: "15px",
                      paddingRight: "30px",
                      paddingLeft: "30px",
                      color: "#ffffff",
                      fontWeight: "bold"
                    }
                  }
                ]
              }
            ],
            values: {
              backgroundColor: "#fef2f2",
              padding: "40px 20px"
            }
          }
        ],
        values: {
          backgroundColor: "#ffffff"
        }
      }
    }
  }
];
