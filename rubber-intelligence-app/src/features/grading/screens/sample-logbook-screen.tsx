import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../../shared/styles/colors";

const AnimatedHeader = ({ navigation, title, icon }: any) => (
  <View>
    <LinearGradient
      colors={[colors.primary, "#1B5E20"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.header}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <MaterialCommunityIcons name={icon} size={24} color="white" />
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <View style={styles.headerPlaceholder} />
    </LinearGradient>
  </View>
);

const RSSLogbook = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("defects");
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();

  // Simulate loading delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Defects data organized by processing stage
  const defectsData = [
    {
      title: "Bubble Defects",
      icon: "water-outline",
      data: [
        {
          id: "1",
          defect: "Pin Head Bubbles",
          icon: "dots-grid",
          causes: [
            "Pre-coagulation of latex",
            "Use of dirty utensils and equipment",
            "Latex contamination with rainwater",
            "Excess acid or high concentration",
            "Insufficient dilution of latex",
          ],
          solutions: [
            "Add anti-coagulants in the field",
            "Use clean and sterilized utensils",
            "Prevent rainwater contamination",
            "Use correct amount of 1% diluted acid",
            "Maintain proper latex dilution (12.5% DRC)",
          ],
        },
        {
          id: "2",
          defect: "Medium Size Bubbles",
          icon: "circle-medium",
          causes: [
            "Fast coagulation process",
            "Insufficient dilution of latex",
            "Insufficient skimming of surface froth",
            "Improper mixing after acid addition",
          ],
          solutions: [
            "Use correct amount of 1% diluted acid",
            "Maintain proper latex dilution",
            "Complete removal of froth after acid addition",
            "Ensure thorough and gentle mixing",
            "Maintain correct sheet thickness (3.2mm)",
          ],
        },
        {
          id: "3",
          defect: "Large Bubbles",
          icon: "circle-double",
          causes: [
            "Too high drying temperature",
            "High thickness of sheets (>3.2mm)",
            "Rapid temperature changes in smoke house",
            "Improper coagulation time",
          ],
          solutions: [
            "Maintain correct drying temperature (48-54°C)",
            "Use sheets with recommended thickness (3.2mm)",
            "Gradual temperature increase in smoke house",
            "Ensure proper coagulation time",
          ],
        },
      ],
    },
    {
      title: "Surface & Appearance Defects",
      icon: "eye-outline",
      data: [
        {
          id: "4",
          defect: "Reaper Marks",
          icon: "format-list-checks",
          causes: [
            "Not turning sheets daily during smoking",
            "Use of dirty or contaminated reapers",
            "Improper spacing between sheets",
            "Rough handling of sheets",
          ],
          solutions: [
            "Turn sheets daily by rotating reapers",
            "Use clean and smooth reapers",
            "Maintain proper spacing between sheets",
            "Handle sheets gently during turning",
          ],
        },
        {
          id: "5",
          defect: "Dirt & Contamination",
          icon: "trash-can-outline",
          causes: [
            "Improper straining of latex",
            "Rubbing sieves too vigorously during straining",
            "Use of bad quality water",
            "Uncovered coagulation process",
            "Unclean smoke houses",
          ],
          solutions: [
            "Proper straining through 40-50 mesh sieve",
            "Avoid vigorous rubbing of sieves",
            "Use pure water strained through fine cloth",
            "Cover coagulation pans properly",
            "Maintain clean smoke houses",
          ],
        },
        {
          id: "6",
          defect: "Dull Colour",
          icon: "palette-outline",
          causes: [
            "Enzymatic discoloration",
            "Insufficient washing of sheets",
            "Smoking of insufficiently drained sheets",
            "Prolonged smoking time",
            "Unevenly thick sheets",
          ],
          solutions: [
            "Add sodium bisulphate solution (3% w/w)",
            "Sufficient washing in running water",
            "Avoid smoking wet sheets",
            "Maintain proper smoking duration (4-5 days)",
            "Use sheets with uniform thickness",
          ],
        },
        {
          id: "7",
          defect: "Rust Spots",
          icon: "alert-octagon-outline",
          causes: [
            "Insufficient washing during milling",
            "Prolonged dripping of wet sheets",
            "Restricted air flow inside smoke house",
            "Too low temperature in smoke house",
            "Use of badly worn-out mills",
          ],
          solutions: [
            "Proper washing during milling process",
            "Shorten dripping time (4-6 hours)",
            "Maintain good air flow in smoke house",
            "Maintain correct drying temperature",
            "Maintain machines in good condition",
          ],
        },
        {
          id: "8",
          defect: "Glossy Surface",
          icon: "white-balance-sunny",
          causes: [
            "Use of wet firewood for smoking",
            "Use of certain firewood types",
            "Incomplete combustion",
            "High moisture content in smoke",
          ],
          solutions: [
            "Use dry firewood for smoking",
            "Avoid coconut shells, husks and paddy husks",
            "Ensure proper combustion",
            "Maintain proper smoke house ventilation",
          ],
        },
      ],
    },
    {
      title: "Structural & Storage Defects",
      icon: "package-variant",
      data: [
        {
          id: "9",
          defect: "Mould Growth",
          icon: "fungus-outline",
          causes: [
            "Delaying in drying process",
            "Storage under high humidity conditions",
            "Insufficient ventilation in store room",
            "Insufficient removal of non-rubber components",
            "Excessive use of sodium sulphite/bisulphate",
          ],
          solutions: [
            "Dry sheets without delay",
            "Store with proper arrangements",
            "Maintain adequate ventilation",
            "Adequate washing to remove non-rubbers",
            "Use recommended levels of chemicals",
          ],
        },
        {
          id: "10",
          defect: "Greasy Sheets",
          icon: "oil",
          causes: [
            "Insufficient washing of sheets",
            "Inadequate dilution of latex",
            "Excess of sodium salts",
            "Drying at high temperature",
            "Contamination with oil and grease",
            "Copper ion contamination",
          ],
          solutions: [
            "Sufficient washing in running water",
            "Dilution at recommended DRC (12.5%)",
            "Use correct chemical doses",
            "Maintain correct drying temperature",
            "Prevent oil and grease contamination",
            "Avoid copper contact",
          ],
        },
        {
          id: "11",
          defect: "Tackiness",
          icon: "hand-back-left-outline",
          causes: [
            "Use of excess sodium salts",
            "Drying at high temperature",
            "Contamination with oil and grease on rollers",
            "Contamination with copper ions",
            "Incomplete drying",
          ],
          solutions: [
            "Use chemicals in correct doses",
            "Maintain correct drying temperature",
            "Prevent latex contamination with oil/grease",
            "Avoid copper contact",
            "Ensure complete drying",
          ],
        },
        {
          id: "12",
          defect: "Thick Edges",
          icon: "border-outside",
          causes: [
            "Insufficient dilution of latex",
            "Use of out-of-shape pans",
            "Placing coagulating pans on non-horizontal surfaces",
            "Negligence during milling process",
            "Improper hand pressing",
          ],
          solutions: [
            "Dilute latex to recommended level",
            "Use pans of correct dimensions and shape",
            "Place pans on horizontal surfaces",
            "Pay attention during milling",
            "Ensure uniform hand pressing",
          ],
        },
        {
          id: "13",
          defect: "Flat Roller Marks",
          icon: "roller-skate",
          causes: [
            "Insufficient dilution",
            "Use of excessive amounts of acid",
            "Using worn out diamond rollers",
            "Improper roller adjustment",
            "Incorrect milling sequence",
          ],
          solutions: [
            "Correct dilution of latex",
            "Use accurate amounts of properly diluted acid",
            "Use good quality rollers",
            "Proper roller adjustment",
            "Follow correct milling sequence",
          ],
        },
        {
          id: "14",
          defect: "Tar Spots",
          icon: "spotlight",
          causes: [
            "No ceiling in the smoke house",
            "Direct contact with smoke particles",
            "Improper smoke house design",
            "Incomplete combustion",
          ],
          solutions: [
            "Introduce V-shaped ceiling to smoke house",
            "Maintain good ventilation",
            "Proper smoke house design",
            "Ensure complete combustion",
          ],
        },
        {
          id: "15",
          defect: "Ash Particles",
          icon: "fire",
          causes: [
            "Using a smaller baffle plate",
            "No baffle plate installed",
            "Careless operational practices",
            "Improper fire management",
          ],
          solutions: [
            "Fix baffle plate of correct measurements",
            "Ensure adequate ventilation",
            "Follow proper operational procedures",
            "Proper fire management",
          ],
        },
      ],
    },
  ];

  // Filter defects based on search query
  const filteredData = defectsData
    .map((section) => ({
      ...section,
      data: section.data.filter(
        (item) =>
          item.defect.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.causes.some((cause) =>
            cause.toLowerCase().includes(searchQuery.toLowerCase())
          ) ||
          item.solutions.some((solution) =>
            solution.toLowerCase().includes(searchQuery.toLowerCase())
          )
      ),
    }))
    .filter((section) => section.data.length > 0);

  // Render each defect item
  const renderDefectItem = (item: any) => (
    <View style={styles.defectCard} key={item.id}>
      <View style={styles.defectHeader}>
        <MaterialCommunityIcons name={item.icon} size={24} color={colors.primary} />
        <Text style={styles.defectTitle}>{item.defect}</Text>
      </View>

      <View style={styles.detailSection}>
        <View style={styles.detailHeader}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={20}
            color={colors.error}
          />
          <Text style={styles.detailTitle}>Root Causes</Text>
        </View>
        {item.causes.map((cause: string, index: number) => (
          <View key={index} style={styles.listItem}>
            <MaterialCommunityIcons
              name="circle-small"
              size={16}
              color={colors.error}
            />
            <Text style={styles.listText}>{cause}</Text>
          </View>
        ))}
      </View>

      <View style={styles.detailSection}>
        <View style={styles.detailHeader}>
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={20}
            color={colors.success}
          />
          <Text style={styles.detailTitle}>Solutions & Prevention</Text>
        </View>
        {item.solutions.map((solution: string, index: number) => (
          <View key={index} style={styles.listItem}>
            <MaterialCommunityIcons
              name="check-circle"
              size={16}
              color={colors.success}
            />
            <Text style={styles.listText}>{solution}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  // Render section header (now static without toggle functionality)
  const renderSectionHeader = (section: any) => (
    <View key={section.title} style={styles.sectionHeader}>
      <View style={styles.sectionHeaderContent}>
        <View style={styles.sectionTitleContainer}>
          <MaterialCommunityIcons
            name={section.icon}
            size={20}
            color={colors.primary}
          />
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
      </View>
    </View>
  );

  // Render defects content - all sections are always visible
  const renderDefectsContent = () => {
    if (filteredData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="magnify-close"
            size={64}
            color="#9CA3AF"
          />
          <Text style={styles.emptyStateTitle}>No defects found</Text>
          <Text style={styles.emptyStateText}>
            No defects match your search criteria
          </Text>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery("")}
          >
            <Text style={styles.clearButtonText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.defectsContainer}>
        {filteredData.map((section) => (
          <View key={section.title}>
            {renderSectionHeader(section)}
            {section.data.map((item) => renderDefectItem(item))}
          </View>
        ))}
      </View>
    );
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  // Loading Screen
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.loadingContent}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={64}
            color={colors.primary}
          />
          <Text style={styles.loadingTitle}>Loading RSS Logbook</Text>
          <Text style={styles.loadingSubtitle}>Preparing quality reference materials...</Text>
          <ActivityIndicator size="large" color={colors.primary} style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Please wait a moment</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <AnimatedHeader navigation={navigation} title="RSS Quality Logbook" icon="clipboard-text-outline" />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInnerContainer}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search defects, causes, or solutions..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "defects" && styles.activeTab]}
          onPress={() => setActiveTab("defects")}
        >
          <MaterialCommunityIcons
            name="alert-decagram-outline"
            size={20}
            color={activeTab === "defects" ? colors.primary : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "defects" && styles.activeTabText,
            ]}
          >
            Common Defects
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "process" && styles.activeTab]}
          onPress={() => setActiveTab("process")}
        >
          <MaterialCommunityIcons
            name="factory"
            size={20}
            color={activeTab === "process" ? colors.primary : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "process" && styles.activeTabText,
            ]}
          >
            Process Guide
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === "defects" ? (
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContentContainer}
          >
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.infoTitle}>
                  RSS Defects Reference Guide
                </Text>
              </View>
              <Text style={styles.infoText}>
                Comprehensive database of common defects in Ribbed Smoked Sheets
                (RSS) with detailed root causes and preventive measures based on
                RubberEX Institute guidelines.
              </Text>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>15</Text>
                  <Text style={styles.statLabel}>Defect Types</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>3</Text>
                  <Text style={styles.statLabel}>Categories</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>50+</Text>
                  <Text style={styles.statLabel}>Solutions</Text>
                </View>
              </View>
            </View>

            {renderDefectsContent()}
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.processGuide}
          >
            <View style={styles.processHeader}>
              <MaterialCommunityIcons
                name="factory"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.processTitle}>RSS Manufacturing Process</Text>
              <Text style={styles.processSubtitle}>
                12-step quality-controlled procedure
              </Text>
            </View>

            {[
              {
                step: 1,
                title: "Latex Collection & Straining",
                description:
                  "Use clean coconut shells or plastic/TPNR cups. Avoid contamination with bark, sand, or rainwater. Add sodium sulphite if pre-coagulation occurs.",
                icon: "water-plus",
              },
              {
                step: 2,
                title: "Standardization",
                description:
                  "Dilute latex to 12.5% DRC using clean, strained water. Refer to metrolac table for correct dilution ratios.",
                icon: "scale-balance",
              },
              {
                step: 3,
                title: "Re-straining",
                description:
                  "Strain bulked latex through 40-50 mesh Monel or stainless steel sieve into clean coagulating vessels.",
                icon: "filter-outline",
              },
              {
                step: 4,
                title: "Acid Preparation",
                description:
                  "Prepare 1% diluted formic acid from 85% concentrated acid. Mix 1 part acid with 84 parts pure water.",
                icon: "flask-outline",
              },
              {
                step: 5,
                title: "Acid Addition & Froth Removal",
                description:
                  "Add diluted acid to standardized latex, mix thoroughly, and skim off resulting froth using smooth board or aluminum sheet.",
                icon: "mixer",
              },
              {
                step: 6,
                title: "Coagulation",
                description:
                  "Cover coagulating pans, place horizontally, and keep undisturbed for adequate period for complete coagulation.",
                icon: "timer-sand",
              },
              {
                step: 7,
                title: "Hand Rolling",
                description:
                  "Drain serum and hand press coagulum on clean surface to uniform thickness without thick edges.",
                icon: "hand-back-left",
              },
              {
                step: 8,
                title: "Milling",
                description:
                  "Roll coagulum through smooth rollers 2-3 times, then through marking rollers. Wash with water spray during milling.",
                icon: "roller",
              },
              {
                step: 9,
                title: "Sheet Washing",
                description:
                  "Soak sheets in running water to wash off residual non-rubbers and prevent discoloration.",
                icon: "water",
              },
              {
                step: 10,
                title: "Dripping",
                description:
                  "Hang sheets to drip for 4-6 hours in shaded area with air draft to remove surface moisture.",
                icon: "water-drip",
              },
              {
                step: 11,
                title: "Smoking",
                description:
                  "Smoke at 48-54°C for 4-5 days, turning sheets daily. Use moderate fire with low smoke level.",
                icon: "fire",
              },
              {
                step: 12,
                title: "Grading & Storage",
                description:
                  "Examine sheets against light, sort into grades based on quality parameters. Store in dry, ventilated area.",
                icon: "package-variant-closed",
              },
            ].map((process, index) => (
              <View key={index} style={styles.processStep}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepNumberContainer}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{process.step}</Text>
                    </View>
                    <MaterialCommunityIcons
                      name={process.icon as any}
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.stepTitle}>{process.title}</Text>
                </View>
                <Text style={styles.stepDescription}>
                  {process.description}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
    padding: 40,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
    marginTop: 20,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerGradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 8,

  },
  headerPlaceholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchInnerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#374151",
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  activeTab: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeTabText: {
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  defectsContainer: {
    paddingBottom: 20,
  },
  infoCard: {
    backgroundColor: "white",
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginLeft: 8,
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  sectionHeader: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  defectCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 18,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  defectHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  defectTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1F2937",
    marginLeft: 10,
    flex: 1,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
    paddingLeft: 4,
  },
  listText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    flex: 1,
    marginLeft: 6,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
    marginHorizontal: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  clearButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clearButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  processGuide: {
    padding: 16,
    paddingBottom: 20,
  },
  processHeader: {
    alignItems: "center",
    marginBottom: 24,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  processTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 12,
    marginBottom: 4,
  },
  processSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  processStep: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  stepNumberContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 12,
  },
  stepNumber: {
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    flex: 1,
  },
  stepDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    paddingLeft: 36,
  },
});

export default RSSLogbook;