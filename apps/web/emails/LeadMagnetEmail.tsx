import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

interface LeadMagnetEmailProps {
  email?: string;
  download_url?: string;
}

const BRAND_COLOR = "#2B7BC4";
const BRAND_LIGHT = "#E8F4FD";
const DEEP_NAVY = "#0D2137";
const STEEL_MID = "#6BAED6";

const CALENDAR_ROWS = [
  {
    day: "Monday",
    type: "Story",
    icon: "📱",
    tip: "Behind-the-scenes of your workspace or team",
  },
  {
    day: "Tuesday",
    type: "Poster",
    icon: "🎨",
    tip: "Educational tip or FAQ carousel",
  },
  {
    day: "Wednesday",
    type: "Story",
    icon: "📱",
    tip: "Poll or question sticker to boost engagement",
  },
  {
    day: "Thursday",
    type: "Poster",
    icon: "🎨",
    tip: "Customer testimonial or case study",
  },
  {
    day: "Friday",
    type: "Story",
    icon: "📱",
    tip: "Product/service spotlight with a CTA",
  },
  {
    day: "Saturday",
    type: "Reel",
    icon: "🎬",
    tip: "Trending audio or how-to tutorial",
  },
  {
    day: "Sunday",
    type: "Reel",
    icon: "🎬",
    tip: "Brand story or lifestyle content",
  },
];

export const LeadMagnetEmail = ({
  email = "there",
  download_url = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
}: LeadMagnetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        Your free 30-day content calendar template is inside — start planning
        today
      </Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Heading style={logoStyle}>Creo</Heading>
            <Text style={taglineStyle}>Digital Marketing, Delivered.</Text>
          </Section>

          <Section style={contentStyle}>
            <Heading as="h1" style={headingStyle}>
              Your 30-Day Content Calendar is Ready
            </Heading>

            <Text style={paragraphStyle}>
              Hi {email.split("@")[0]},
            </Text>

            <Text style={paragraphStyle}>
              You just made a smart move. This isn&apos;t a generic
              spreadsheet — it&apos;s the exact content framework our agency
              uses to manage <strong>50+ local businesses</strong> and deliver
              over <strong>1,200 pieces of content every month</strong>.
            </Text>

            <Text style={paragraphStyle}>
              Inside, you&apos;ll find a structured 30-day posting schedule
              designed specifically for local businesses like yours — with the
              right content types on the right days to maximize reach and
              engagement.
            </Text>

            <Section style={buttonContainerStyle}>
              <Button href={download_url} style={buttonStyle}>
                Download Your Free Template
              </Button>
            </Section>

            <Hr style={hrStyle} />

            <Heading as="h2" style={subheadingStyle}>
              Your Weekly Content Framework
            </Heading>

            <Text style={paragraphStyle}>
              Each week follows this proven rhythm — posters and stories on
              weekdays for consistency, high-reach reels on weekends for growth.
            </Text>

            <Section style={calendarContainerStyle}>
              {CALENDAR_ROWS.map((row) => (
                <Row key={row.day} style={calendarRowStyle}>
                  <Column style={calendarDayColStyle}>
                    <Text style={calendarDayStyle}>{row.day}</Text>
                  </Column>
                  <Column style={calendarTypeColStyle}>
                    <Text style={calendarTypeStyle}>
                      {row.icon} {row.type}
                    </Text>
                  </Column>
                  <Column style={calendarTipColStyle}>
                    <Text style={calendarTipStyle}>{row.tip}</Text>
                  </Column>
                </Row>
              ))}
            </Section>

            <Hr style={hrStyle} />

            <Heading as="h2" style={subheadingStyle}>
              What Happens Next?
            </Heading>

            <Text style={listItemStyle}>
              ✓ Use the calendar to plan your first 30 days of content
            </Text>
            <Text style={listItemStyle}>
              ✓ Customize the topics to match your brand and audience
            </Text>
            <Text style={listItemStyle}>
              ✓ Schedule posts in advance for a consistent presence
            </Text>
            <Text style={listItemStyle}>
              ✓ See measurable growth within the first month
            </Text>

            <Text style={paragraphStyle}>
              Want us to handle this for you? Creo manages everything —
              strategy, creation, scheduling, and analytics — so you can focus
              on running your business.
            </Text>

            <Section style={buttonContainerStyle}>
              <Button
                href="https://creo.app/pricing"
                style={ctaButtonStyle}
              >
                See Our Plans
              </Button>
            </Section>

            <Text style={signatureStyle}>
              Cheers,
              <br />
              The Creo Team
            </Text>
          </Section>

          <Hr style={hrStyle} />

          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              © {new Date().getFullYear()} Creo — Digital Marketing Agency
              Platform
            </Text>
            <Text style={footerTextStyle}>
              You received this because you downloaded our free content calendar
              template at creo.app.
            </Text>
            <Text style={footerTextStyle}>
              <a href="https://creo.app/unsubscribe" style={unsubscribeStyle}>
                Unsubscribe
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default LeadMagnetEmail;

const bodyStyle: React.CSSProperties = {
  backgroundColor: BRAND_LIGHT,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: "0",
  padding: "0",
};

const containerStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  boxShadow: "0 1px 3px rgba(13, 33, 55, 0.08)",
  margin: "40px auto",
  maxWidth: "600px",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  backgroundColor: DEEP_NAVY,
  padding: "32px 40px",
  textAlign: "center" as const,
};

const logoStyle: React.CSSProperties = {
  color: BRAND_COLOR,
  fontSize: "28px",
  fontWeight: "700",
  margin: "0",
};

const taglineStyle: React.CSSProperties = {
  color: STEEL_MID,
  fontSize: "13px",
  margin: "4px 0 0",
  letterSpacing: "1px",
  textTransform: "uppercase" as const,
};

const contentStyle: React.CSSProperties = {
  padding: "40px",
};

const headingStyle: React.CSSProperties = {
  color: DEEP_NAVY,
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 16px",
  textAlign: "center" as const,
};

const subheadingStyle: React.CSSProperties = {
  color: DEEP_NAVY,
  fontSize: "18px",
  fontWeight: "600",
  margin: "24px 0 12px",
};

const paragraphStyle: React.CSSProperties = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const listItemStyle: React.CSSProperties = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 8px",
};

const buttonContainerStyle: React.CSSProperties = {
  margin: "24px 0",
  textAlign: "center" as const,
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: BRAND_COLOR,
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  padding: "14px 32px",
  textDecoration: "none",
  display: "inline-block",
};

const ctaButtonStyle: React.CSSProperties = {
  backgroundColor: DEEP_NAVY,
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  padding: "14px 32px",
  textDecoration: "none",
  display: "inline-block",
};

const calendarContainerStyle: React.CSSProperties = {
  backgroundColor: BRAND_LIGHT,
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
};

const calendarRowStyle: React.CSSProperties = {
  borderBottom: "1px solid #C9DFF0",
  padding: "8px 0",
};

const calendarDayColStyle: React.CSSProperties = {
  width: "100px",
  verticalAlign: "top" as const,
};

const calendarTypeColStyle: React.CSSProperties = {
  width: "100px",
  verticalAlign: "top" as const,
};

const calendarTipColStyle: React.CSSProperties = {
  verticalAlign: "top" as const,
};

const calendarDayStyle: React.CSSProperties = {
  color: DEEP_NAVY,
  fontSize: "13px",
  fontWeight: "600",
  margin: "0",
};

const calendarTypeStyle: React.CSSProperties = {
  color: BRAND_COLOR,
  fontSize: "13px",
  fontWeight: "600",
  margin: "0",
};

const calendarTipStyle: React.CSSProperties = {
  color: "#374151",
  fontSize: "13px",
  lineHeight: "18px",
  margin: "0",
};

const signatureStyle: React.CSSProperties = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "24px 0 0",
};

const hrStyle: React.CSSProperties = {
  borderColor: "#C9DFF0",
  margin: "0",
};

const footerStyle: React.CSSProperties = {
  padding: "24px 40px",
  textAlign: "center" as const,
};

const footerTextStyle: React.CSSProperties = {
  color: "#6BAED6",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 4px",
};

const unsubscribeStyle: React.CSSProperties = {
  color: "#6BAED6",
  textDecoration: "underline",
};
