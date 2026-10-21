import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Image,
    Modal,
    SafeAreaView,
    Animated as RNAnimated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Ionicons,
    MaterialCommunityIcons,
    MaterialIcons,
    FontAwesome5,
} from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../../shared/styles/colors';

const { width, height } = Dimensions.get('window');

interface ProcessStep {
    id: string;
    title: string;
    description: string;
    duration: string;
    keyPoints: string[];
    icon: string;
    color: string;
    imageUrl?: string;
    tips?: string[];
    qualityCheck?: string[];
    tools?: string[];
}

// Rubber Latex Production Process Steps
const processSteps: ProcessStep[] = [
    {
        id: 'step-1',
        title: 'Tree Selection & Preparation',
        description: 'Selecting mature rubber trees (6-7 years old) and preparing them for tapping. Trees must be healthy with proper trunk diameter and bark thickness.',
        duration: 'Daily, Early Morning',
        keyPoints: [
            'Select trees aged 6-7 years',
            'Check tree health and bark condition',
            'Prepare tapping tools and collection cups',
            'Ensure proper weather conditions'
        ],
        icon: 'tree',
        color: '#10B981',
        tips: [
            'Tap only healthy trees without diseases',
            'Avoid tapping during rainy season',
            'Maintain proper spacing between trees'
        ],
        qualityCheck: [
            'Tree age verification',
            'Bark thickness measurement',
            'Overall tree health assessment'
        ],
        tools: ['Tapping knife', 'Measuring tape', 'Tree markers']
    },
    {
        id: 'step-2',
        title: 'Tapping Process',
        description: 'Making precise incisions in the bark to extract latex without damaging the tree. The cut should be at a 30-degree angle, about 1.5mm deep.',
        duration: '5-10 minutes per tree',
        keyPoints: [
            'Make precise 30-degree angled cuts',
            'Cut depth: 1.5mm maximum',
            'Follow spiral pattern on bark',
            'Use sharp, sterilized tapping knife'
        ],
        icon: 'water-outline',
        color: '#3B82F6',
        tips: [
            'Always tap from left to right',
            'Change knife position regularly',
            'Avoid damaging cambium layer'
        ],
        qualityCheck: [
            'Cut angle verification',
            'Latex flow consistency',
            'Bark damage assessment'
        ],
        tools: ['Sterilized tapping knife', 'Angle guide', 'Collection cups']
    },
    {
        id: 'step-3',
        title: 'Latex Collection',
        description: 'Collecting fresh latex into clean containers. Latex flows for 2-4 hours after tapping and must be collected before it coagulates.',
        duration: '2-4 hours after tapping',
        keyPoints: [
            'Collect latex within 2-4 hours',
            'Use clean, non-reactive containers',
            'Filter latex through mesh',
            'Prevent contamination'
        ],
        icon: 'beaker',
        color: '#8B5CF6',
        tips: [
            'Collect early morning latex (highest yield)',
            'Avoid metal containers (causes coagulation)',
            'Keep containers covered'
        ],
        qualityCheck: [
            'Latex color and consistency',
            'Contamination check',
            'Collection time verification'
        ],
        tools: ['Plastic containers', 'Strainers', 'Measuring cylinders']
    },
    {
        id: 'step-4',
        title: 'Field Stabilization',
        description: 'Adding ammonia or other preservatives to raw latex to prevent premature coagulation during transport to processing plant.',
        duration: 'Immediate after collection',
        keyPoints: [
            'Add 0.5-1% ammonia solution',
            'Mix thoroughly',
            'Maintain pH level 10-11',
            'Prevent bacterial growth'
        ],
        icon: 'shield-check',
        color: '#F59E0B',
        tips: [
            'Add stabilizer immediately after collection',
            'Use proper mixing equipment',
            'Test pH regularly'
        ],
        qualityCheck: [
            'pH level measurement',
            'Coagulation test',
            'Ammonia concentration check'
        ],
        tools: ['Ammonia solution', 'pH meter', 'Mixing containers']
    },
    {
        id: 'step-5',
        title: 'Transport to Factory',
        description: 'Transporting stabilized latex to processing facility in insulated containers to maintain temperature and prevent quality degradation.',
        duration: 'Within 8 hours',
        keyPoints: [
            'Use insulated containers',
            'Maintain temperature 20-30°C',
            'Avoid direct sunlight',
            'Prevent mechanical agitation'
        ],
        icon: 'truck-fast',
        color: '#6366F1',
        tips: [
            'Transport during cooler hours',
            'Secure containers to prevent spillage',
            'Document batch information'
        ],
        qualityCheck: [
            'Temperature monitoring',
            'Container integrity check',
            'Transit time verification'
        ],
        tools: ['Insulated tanks', 'Temperature loggers', 'Transport documents']
    },
    {
        id: 'step-6',
        title: 'Factory Reception & Testing',
        description: 'Quality testing of incoming latex for DRC (Dry Rubber Content), alkalinity, and contamination before processing.',
        duration: '30-60 minutes',
        keyPoints: [
            'Measure DRC percentage',
            'Test pH and alkalinity',
            'Check for contamination',
            'Record batch details'
        ],
        icon: 'clipboard-check',
        color: '#EC4899',
        tips: [
            'Test multiple samples from each batch',
            'Use calibrated instruments',
            'Maintain detailed records'
        ],
        qualityCheck: [
            'DRC measurement (30-40% ideal)',
            'pH verification (10-11)',
            'Visual contamination check'
        ],
        tools: ['DRC testing kit', 'pH meter', 'Microscope', 'Lab equipment']
    },
    {
        id: 'step-7',
        title: 'Centrifugation & Concentration',
        description: 'Separating rubber particles from serum using high-speed centrifuges to concentrate latex to 60% DRC.',
        duration: '20-30 minutes',
        keyPoints: [
            'Centrifuge at 6000-8000 RPM',
            'Separate cream from serum',
            'Concentrate to 60% DRC',
            'Collect skim rubber'
        ],
        icon: 'rotate-3d',
        color: '#0EA5E9',
        tips: [
            'Maintain consistent centrifuge speed',
            'Regular equipment maintenance',
            'Monitor separation efficiency'
        ],
        qualityCheck: [
            'DRC after concentration',
            'Separation efficiency',
            'Equipment performance'
        ],
        tools: ['Industrial centrifuge', 'DRC tester', 'Collection tanks']
    },
    {
        id: 'step-8',
        title: 'Preservation & Storage',
        description: 'Adding long-term preservatives and storing concentrated latex under controlled conditions.',
        duration: 'Ongoing',
        keyPoints: [
            'Add ammonia/formaldehyde',
            'Maintain temperature 25-30°C',
            'Regular agitation',
            'Monitor preservation levels'
        ],
        icon: 'database',
        color: '#84CC16',
        tips: [
            'Store in dark, cool conditions',
            'Regular quality checks',
            'Proper labeling and dating'
        ],
        qualityCheck: [
            'Preservative concentration',
            'Storage temperature',
            'Latex viscosity'
        ],
        tools: ['Storage tanks', 'Agitators', 'Preservative dosing system']
    },
    {
        id: 'step-9',
        title: 'Compounding & Vulcanization',
        description: 'Mixing latex with chemicals (sulfur, accelerators) and heating to create cross-links for elasticity and strength.',
        duration: '2-4 hours',
        keyPoints: [
            'Add sulfur compound',
            'Mix with accelerators',
            'Heat to 100-140°C',
            'Monitor vulcanization time'
        ],
        icon: 'mixer',
        color: '#F97316',
        tips: [
            'Precise chemical measurements',
            'Consistent temperature control',
            'Regular mixing'
        ],
        qualityCheck: [
            'Cross-link density',
            'Tensile strength',
            'Elasticity measurement'
        ],
        tools: ['Mixing vats', 'Heating system', 'Vulcanization press']
    },
    {
        id: 'step-10',
        title: 'Quality Control Testing',
        description: 'Comprehensive testing of final latex product for physical properties, chemical composition, and consistency.',
        duration: '1-2 hours',
        keyPoints: [
            'Tensile strength test',
            'Elongation at break',
            'Chemical composition',
            'Batch consistency'
        ],
        icon: 'chart-line',
        color: '#EF4444',
        tips: [
            'Test multiple samples',
            'Use standardized methods',
            'Maintain calibration'
        ],
        qualityCheck: [
            'Physical properties',
            'Chemical safety',
            'Batch uniformity'
        ],
        tools: ['Tensile tester', 'Spectrometer', 'Quality control lab']
    },
    {
        id: 'step-11',
        title: 'Packaging & Labeling',
        description: 'Packaging finished latex products with proper labeling including batch number, production date, and quality specifications.',
        duration: '30-60 minutes',
        keyPoints: [
            'Use airtight packaging',
            'Proper labeling',
            'Batch traceability',
            'Storage instructions'
        ],
        icon: 'package-variant',
        color: '#8B5CF6',
        tips: [
            'Check packaging integrity',
            'Accurate labeling',
            'Proper storage conditions'
        ],
        qualityCheck: [
            'Package seal integrity',
            'Label accuracy',
            'Weight verification'
        ],
        tools: ['Packaging machines', 'Label printers', 'Sealing equipment']
    },
    {
        id: 'step-12',
        title: 'Distribution & Sale',
        description: 'Distributing finished latex products to customers with proper documentation and quality certificates.',
        duration: 'Varies',
        keyPoints: [
            'Quality certification',
            'Proper documentation',
            'Customer specifications',
            'Transport conditions'
        ],
        icon: 'cart',
        color: '#10B981',
        tips: [
            'Maintain cold chain if required',
            'Provide quality certificates',
            'Track shipments'
        ],
        qualityCheck: [
            'Documentation completeness',
            'Transport conditions',
            'Customer satisfaction'
        ],
        tools: ['Shipping documents', 'Quality certificates', 'Tracking system']
    }
];

interface QuickTip {
    id: string;
    title: string;
    description: string;
    icon: string;
}

const quickTips: QuickTip[] = [
    {
        id: 'tip-1',
        title: 'Optimal Tapping Time',
        description: 'Tap trees between 5-7 AM when latex flow is maximum and temperature is optimal.',
        icon: 'clock-outline'
    },
    {
        id: 'tip-2',
        title: 'Quality Indicators',
        description: 'High-quality latex should be creamy white, have pH 10-11, and DRC of 60% after concentration.',
        icon: 'quality-high'
    },
    {
        id: 'tip-3',
        title: 'Storage Guidelines',
        description: 'Store latex at 25-30°C in dark conditions. Agitate regularly to prevent separation.',
        icon: 'database'
    },
    {
        id: 'tip-4',
        title: 'Safety Measures',
        description: 'Always wear protective gear when handling latex and chemicals. Ensure proper ventilation.',
        icon: 'shield-check'
    }
];

export default function LatexProcessGuide() {
    const navigation = useNavigation();
    const [selectedStep, setSelectedStep] = useState<ProcessStep>(processSteps[0]);
    const [modalVisible, setModalVisible] = useState(false);
    const [viewMode, setViewMode] = useState<'timeline' | 'detailed'>('timeline');
    const scrollViewRef = useRef<ScrollView>(null);
    const [completedSteps, setCompletedSteps] = useState<string[]>(['step-1', 'step-2', 'step-3']);

    const handleStepSelect = (step: ProcessStep) => {
        setSelectedStep(step);
        setModalVisible(true);
    };

    const toggleStepCompletion = (stepId: string) => {
        setCompletedSteps(prev =>
            prev.includes(stepId)
                ? prev.filter(id => id !== stepId)
                : [...prev, stepId]
        );
    };

    const renderTimelineView = () => (
        <View style={styles.timelineContainer}>
            {processSteps.map((step, index) => {
                const isCompleted = completedSteps.includes(step.id);
                const isActive = selectedStep.id === step.id;

                return (
                    <Animated.View
                        key={step.id}
                        entering={FadeIn.delay(index * 100).duration(400)}
                        style={styles.timelineStep}
                    >
                        {/* Timeline connector */}
                        {index < processSteps.length - 1 && (
                            <View style={[
                                styles.timelineConnector,
                                isCompleted && styles.timelineConnectorCompleted
                            ]} />
                        )}

                        {/* Step circle */}
                        <TouchableOpacity
                            style={[
                                styles.stepCircle,
                                { backgroundColor: step.color },
                                isCompleted && styles.stepCircleCompleted,
                                isActive && styles.stepCircleActive
                            ]}
                            onPress={() => handleStepSelect(step)}
                        >
                            <MaterialCommunityIcons
                                name={step.icon as any}
                                size={20}
                                color="#FFFFFF"
                            />
                            {isCompleted && (
                                <View style={styles.completedCheck}>
                                    <MaterialIcons name="check" size={16} color="#FFFFFF" />
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Step info */}
                        <TouchableOpacity
                            style={[
                                styles.stepInfoCard,
                                isActive && styles.stepInfoCardActive
                            ]}
                            onPress={() => handleStepSelect(step)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.stepHeader}>
                                <View style={styles.stepTitleContainer}>
                                    <Text style={styles.stepNumber}>Step {index + 1}</Text>
                                    <Text style={styles.stepTitle}>{step.title}</Text>
                                </View>
                                <View style={styles.stepDuration}>
                                    <MaterialIcons name="schedule" size={14} color="#6B7280" />
                                    <Text style={styles.durationText}>{step.duration}</Text>
                                </View>
                            </View>

                            <Text style={styles.stepDescription} numberOfLines={2}>
                                {step.description}
                            </Text>

                            <View style={styles.stepFooter}>
                                <View style={styles.keyPointsPreview}>
                                    {step.keyPoints.slice(0, 2).map((point, i) => (
                                        <View key={i} style={styles.keyPointTag}>
                                            <MaterialCommunityIcons
                                                name="circle-small"
                                                size={16}
                                                color={step.color}
                                            />
                                            <Text style={styles.keyPointText} numberOfLines={1}>
                                                {point}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.completeButton,
                                        isCompleted && styles.completeButtonCompleted
                                    ]}
                                    onPress={() => toggleStepCompletion(step.id)}
                                >
                                    <MaterialIcons
                                        name={isCompleted ? "check-circle" : "radio-button-unchecked"}
                                        size={20}
                                        color={isCompleted ? '#10B981' : '#6B7280'}
                                    />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                );
            })}
        </View>
    );

    const renderDetailedView = () => (
        <ScrollView
            style={styles.detailedContainer}
            showsVerticalScrollIndicator={false}
        >
            {processSteps.map((step, index) => (
                <Animated.View
                    key={step.id}
                    entering={FadeIn.delay(index * 100).duration(400)}
                    style={styles.detailedStepCard}
                >
                    <LinearGradient
                        colors={[`${step.color}15`, '#FFFFFF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.detailedCardGradient}
                    >
                        {/* Step header */}
                        <View style={styles.detailedHeader}>
                            <Text style={styles.detailedStepNumber}>
                                step {(index + 1).toString().padStart(2, '0')}
                            </Text>
                            <Text style={styles.detailedStepTitle}>{step.title}</Text>
                            <View style={styles.detailedDurationRow}>
                                <MaterialIcons name="schedule" size={14} color="#6B7280" />
                                <Text style={styles.detailedDurationText}>{step.duration}</Text>
                            </View>
                        </View>

                        {/* Description */}
                        <Text style={styles.detailedDescription}>{step.description}</Text>

                        {/* Key points */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionIconContainer}>
                                    <MaterialCommunityIcons name="check-circle-outline" size={20} color={step.color} />
                                </View>
                                <Text style={styles.sectionTitle}>Key Points</Text>
                            </View>
                            <View style={styles.keyPointsGrid}>
                                {step.keyPoints.map((point, i) => (
                                    <View key={i} style={styles.keyPointItem}>
                                        <View style={[styles.keyPointIcon, { backgroundColor: `${step.color}20` }]}>
                                            <Text style={[styles.keyPointNumber, { color: step.color }]}>
                                                {i + 1}
                                            </Text>
                                        </View>
                                        <Text style={styles.keyPointItemText}>{point}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Tools & Tips */}
                        <View style={styles.toolsTipsRow}>
                            {step.tools && (
                                <View style={styles.toolsSection}>
                                    <View style={styles.sectionHeader}>
                                        <View style={styles.sectionIconContainer}>
                                            <MaterialCommunityIcons name="tools" size={20} color="#6B7280" />
                                        </View>
                                        <Text style={styles.sectionSubtitle}>Tools Required</Text>
                                    </View>
                                    <View style={styles.toolsList}>
                                        {step.tools.map((tool, i) => (
                                            <View key={i} style={styles.toolItem}>
                                                <MaterialCommunityIcons
                                                    name="circle-small"
                                                    size={12}
                                                    color={step.color}
                                                />
                                                <Text style={styles.toolText}>{tool}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {step.tips && (
                                <View style={styles.tipsSection}>
                                    <View style={styles.sectionHeader}>
                                        <View style={styles.sectionIconContainer}>
                                            <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#F59E0B" />
                                        </View>
                                        <Text style={styles.sectionSubtitle}>Pro Tips</Text>
                                    </View>
                                    <View style={styles.tipsList}>
                                        {step.tips.map((tip, i) => (
                                            <View key={i} style={styles.tipItem}>
                                                <MaterialCommunityIcons
                                                    name="lightbulb"
                                                    size={12}
                                                    color="#F59E0B"
                                                />
                                                <Text style={styles.tipText}>{tip}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Quality Check */}
                        {step.qualityCheck && (
                            <View style={styles.qualitySection}>
                                <View style={styles.sectionHeader}>
                                    <View style={styles.sectionIconContainer}>
                                        <MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#10B981" />
                                    </View>
                                    <Text style={styles.sectionTitle}>Quality Checks</Text>
                                </View>
                                <View style={styles.qualityList}>
                                    {step.qualityCheck.map((check, i) => (
                                        <View key={i} style={styles.qualityItem}>
                                            <View style={styles.qualityCheckbox}>
                                                <MaterialIcons name="check-box-outline-blank" size={16} color="#10B981" />
                                            </View>
                                            <Text style={styles.qualityText}>{check}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Action buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.completeStepButton,
                                    completedSteps.includes(step.id) && styles.completeStepButtonCompleted
                                ]}
                                onPress={() => toggleStepCompletion(step.id)}
                            >
                                <MaterialIcons
                                    name={completedSteps.includes(step.id) ? "check-circle" : "radio-button-unchecked"}
                                    size={20}
                                    color={completedSteps.includes(step.id) ? '#10B981' : '#6B7280'}
                                />
                                <Text style={[
                                    styles.completeButtonText,
                                    completedSteps.includes(step.id) && styles.completeButtonTextCompleted
                                ]}>
                                    {completedSteps.includes(step.id) ? 'Completed' : 'Mark as Complete'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.viewDetailsButton}
                                onPress={() => handleStepSelect(step)}
                            >
                                <Text style={styles.viewDetailsText}>View Details</Text>
                                <MaterialIcons name="chevron-right" size={20} color={step.color} />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </Animated.View>
            ))}
        </ScrollView>
    );

    const renderStepModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <SafeAreaView style={styles.modalContainer}>
                <LinearGradient
                    colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                    style={styles.modalOverlay}
                >
                    <Animated.View
                        entering={FadeInDown.duration(400)}
                        style={styles.modalContent}
                    >
                        <LinearGradient
                            colors={['#FFFFFF', '#F8FAFC']}
                            style={styles.modalGradient}
                        >
                            {/* Modal header */}
                            <View style={styles.modalHeader}>
                                <View style={styles.modalStepHeader}>
                                    <LinearGradient
                                        colors={[selectedStep.color, `${selectedStep.color}80`]}
                                        style={styles.modalStepIcon}
                                    >
                                        <MaterialCommunityIcons
                                            name={selectedStep.icon as any}
                                            size={28}
                                            color="#FFFFFF"
                                        />
                                    </LinearGradient>
                                    <View style={styles.modalStepInfo}>
                                        <Text style={styles.modalStepTitle}>{selectedStep.title}</Text>
                                        <View style={styles.modalDuration}>
                                            <MaterialIcons name="schedule" size={16} color="#6B7280" />
                                            <Text style={styles.modalDurationText}>{selectedStep.duration}</Text>
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.modalCloseButton}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <MaterialIcons name="close" size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                {/* Process Overview */}
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>Process Description</Text>
                                    <Text style={styles.modalDescription}>{selectedStep.description}</Text>
                                </View>

                                {/* Key Points */}
                                <View style={styles.modalSection}>
                                    <View style={styles.modalSectionHeader}>
                                        <View style={styles.sectionIconContainer}>
                                            <MaterialCommunityIcons name="check-circle" size={20} color={selectedStep.color} />
                                        </View>
                                        <Text style={styles.modalSectionTitle}>Key Process Points</Text>
                                    </View>
                                    <View style={styles.modalKeyPoints}>
                                        {selectedStep.keyPoints.map((point, index) => (
                                            <View key={index} style={styles.modalKeyPoint}>
                                                <View style={[styles.keyPointIndex, { backgroundColor: selectedStep.color }]}>
                                                    <Text style={styles.keyPointIndexText}>{index + 1}</Text>
                                                </View>
                                                <Text style={styles.modalKeyPointText}>{point}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                {/* Quality Standards */}
                                {selectedStep.qualityCheck && (
                                    <View style={styles.modalSection}>
                                        <View style={styles.modalSectionHeader}>
                                            <View style={styles.sectionIconContainer}>
                                                <MaterialCommunityIcons name="clipboard-check" size={20} color="#10B981" />
                                            </View>
                                            <Text style={styles.modalSectionTitle}>Quality Standards</Text>
                                        </View>
                                        <View style={styles.qualityStandards}>
                                            {selectedStep.qualityCheck.map((standard, index) => (
                                                <View key={index} style={styles.qualityStandard}>
                                                    <MaterialCommunityIcons
                                                        name="check-circle"
                                                        size={16}
                                                        color="#10B981"
                                                    />
                                                    <Text style={styles.qualityStandardText}>{standard}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Tools & Equipment */}
                                {selectedStep.tools && (
                                    <View style={styles.modalSection}>
                                        <View style={styles.modalSectionHeader}>
                                            <View style={styles.sectionIconContainer}>
                                                <MaterialCommunityIcons name="toolbox-outline" size={20} color="#3B82F6" />
                                            </View>
                                            <Text style={styles.modalSectionTitle}>Required Tools & Equipment</Text>
                                        </View>
                                        <View style={styles.toolsGrid}>
                                            {selectedStep.tools.map((tool, index) => (
                                                <View key={index} style={styles.toolCard}>
                                                    <MaterialCommunityIcons
                                                        name="wrench"
                                                        size={20}
                                                        color="#3B82F6"
                                                    />
                                                    <Text style={styles.toolName}>{tool}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Best Practices */}
                                {selectedStep.tips && (
                                    <View style={styles.modalSection}>
                                        <View style={styles.modalSectionHeader}>
                                            <View style={styles.sectionIconContainer}>
                                                <MaterialCommunityIcons name="lightbulb-on" size={20} color="#F59E0B" />
                                            </View>
                                            <Text style={styles.modalSectionTitle}>Best Practices & Tips</Text>
                                        </View>
                                        <View style={styles.tipsList}>
                                            {selectedStep.tips.map((tip, index) => (
                                                <View key={index} style={styles.tipCard}>
                                                    <MaterialCommunityIcons
                                                        name="star-circle"
                                                        size={16}
                                                        color="#F59E0B"
                                                    />
                                                    <Text style={styles.tipText}>{tip}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Process Notes */}
                                <View style={styles.modalSection}>
                                    <View style={styles.modalSectionHeader}>
                                        <View style={styles.sectionIconContainer}>
                                            <MaterialCommunityIcons name="note-text" size={20} color="#8B5CF6" />
                                        </View>
                                        <Text style={styles.modalSectionTitle}>Process Notes</Text>
                                    </View>
                                    <View style={styles.notesCard}>
                                        <Text style={styles.notesText}>
                                            This is a critical step in the latex production process.
                                            Ensure all quality checks are completed before proceeding
                                            to the next stage. Document any deviations from standard
                                            procedures.
                                        </Text>
                                    </View>
                                </View>
                            </ScrollView>

                            {/* Modal footer */}
                            <View style={styles.modalFooter}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.completeModalButton]}
                                    onPress={() => {
                                        toggleStepCompletion(selectedStep.id);
                                        setModalVisible(false);
                                    }}
                                >
                                    <MaterialIcons
                                        name={completedSteps.includes(selectedStep.id) ? "check-circle" : "radio-button-unchecked"}
                                        size={20}
                                        color="#FFFFFF"
                                    />
                                    <Text style={styles.modalButtonText}>
                                        {completedSteps.includes(selectedStep.id) ? 'Step Completed' : 'Mark Step Complete'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.nextStepButton]}
                                    onPress={() => {
                                        const currentIndex = processSteps.findIndex(step => step.id === selectedStep.id);
                                        if (currentIndex < processSteps.length - 1) {
                                            setSelectedStep(processSteps[currentIndex + 1]);
                                        }
                                    }}
                                >
                                    <Text style={[styles.modalButtonText, { color: selectedStep.color }]}>Next Step</Text>
                                    <MaterialIcons name="arrow-forward" size={20} color={selectedStep.color} />
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </Animated.View>
                </LinearGradient>
            </SafeAreaView>
        </Modal>
    );

    const renderQuickTips = () => (
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <View style={styles.quickTipsHeader}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color="#F59E0B" />
                <Text style={styles.quickTipsTitle}>Quick Tips & Guidelines</Text>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickTipsScroll}
                contentContainerStyle={styles.quickTipsContent}
            >
                {quickTips.map((tip) => (
                    <LinearGradient
                        key={tip.id}
                        colors={['#FFFFFF', '#FEFCE8']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.quickTipCard}
                    >
                        <View style={styles.tipIconContainer}>
                            <MaterialCommunityIcons name={tip.icon as any} size={24} color="#F59E0B" />
                        </View>
                        <Text style={styles.quickTipTitle}>{tip.title}</Text>
                        <Text style={styles.quickTipDescription}>{tip.description}</Text>
                    </LinearGradient>
                ))}
            </ScrollView>
        </Animated.View>
    );

    const renderProgressSummary = () => {
        const progress = (completedSteps.length / processSteps.length) * 100;

        return (
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                <View style={styles.progressCard}>
                    <LinearGradient
                        colors={[colors.primary, '#1B5E20']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.progressGradient}
                    >
                        <View style={styles.progressContent}>
                            <View style={styles.progressHeader}>
                                <MaterialCommunityIcons name="progress-check" size={28} color="#FFFFFF" />
                                <View style={styles.progressText}>
                                    <Text style={styles.progressTitle}>Process Completion</Text>
                                    <Text style={styles.progressSubtitle}>
                                        {completedSteps.length} of {processSteps.length} steps completed
                                    </Text>
                                </View>
                            </View>

                            {/* Progress bar */}
                            <View style={styles.progressBarContainer}>
                                <View style={styles.progressBar}>
                                    <RNAnimated.View
                                        style={[
                                            styles.progressFill,
                                            { width: `${progress}%`, backgroundColor: '#FFFFFF' }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
                            </View>

                            {/* Stats */}
                            <View style={styles.progressStats}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>{completedSteps.length}</Text>
                                    <Text style={styles.statLabel}>Completed</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>{processSteps.length - completedSteps.length}</Text>
                                    <Text style={styles.statLabel}>Remaining</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>{processSteps.length}</Text>
                                    <Text style={styles.statLabel}>Total Steps</Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </View>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[colors.primary, '#1B5E20']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <Animated.View
                    entering={FadeInDown.duration(400)}
                    style={styles.headerContent}
                >
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Latex Process Guide</Text>
                        <Text style={styles.headerSubtitle}>From Tree Tapping to Final Product</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.viewToggleButton}
                        onPress={() => setViewMode(viewMode === 'timeline' ? 'detailed' : 'timeline')}
                    >
                        <MaterialIcons
                            name={viewMode === 'timeline' ? 'view-agenda' : 'timeline'}
                            size={24}
                            color="#FFF"
                        />
                    </TouchableOpacity>
                </Animated.View>
            </LinearGradient>

            {/* Main Content */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Progress Summary */}
                {renderProgressSummary()}

                {/* Quick Tips */}
                {renderQuickTips()}

                {/* View Toggle */}
                <View style={styles.viewToggleContainer}>
                    <TouchableOpacity
                        style={[styles.viewToggleOption, viewMode === 'timeline' && styles.viewToggleActive]}
                        onPress={() => setViewMode('timeline')}
                    >
                        <MaterialIcons
                            name="timeline"
                            size={20}
                            color={viewMode === 'timeline' ? colors.primary : '#6B7280'}
                        />
                        <Text style={[
                            styles.viewToggleText,
                            viewMode === 'timeline' && styles.viewToggleTextActive
                        ]}>
                            Timeline View
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.viewToggleOption, viewMode === 'detailed' && styles.viewToggleActive]}
                        onPress={() => setViewMode('detailed')}
                    >
                        <MaterialIcons
                            name="view-agenda"
                            size={20}
                            color={viewMode === 'detailed' ? colors.primary : '#6B7280'}
                        />
                        <Text style={[
                            styles.viewToggleText,
                            viewMode === 'detailed' && styles.viewToggleTextActive
                        ]}>
                            Detailed View
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Process Steps */}
                {viewMode === 'timeline' ? renderTimelineView() : renderDetailedView()}

                {/* Bottom spacing */}
                <View style={styles.bottomSpacing} />
            </ScrollView>

            {/* Step Detail Modal */}
            {renderStepModal()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 10,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerTextContainer: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 16,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
        fontWeight: '500',
    },
    viewToggleButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    // Progress Summary
    progressCard: {
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 20,
    },
    progressGradient: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    progressContent: {
        padding: 24,
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    progressText: {
        marginLeft: 16,
        flex: 1,
    },
    progressTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    progressSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
    },
    progressBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressPercentage: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        minWidth: 45,
    },
    progressStats: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    // Quick Tips
    quickTipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    quickTipsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginLeft: 12,
        flex: 1,
    },
    quickTipsScroll: {
        marginBottom: 20,
    },
    quickTipsContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    quickTipCard: {
        width: 220,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    tipIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    quickTipTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    quickTipDescription: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    // View Toggle
    viewToggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 16,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    viewToggleOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    viewToggleActive: {
        backgroundColor: '#F0F9FF',
    },
    viewToggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    viewToggleTextActive: {
        color: colors.primary,
    },
    // Timeline View
    timelineContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    timelineStep: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    timelineConnector: {
        position: 'absolute',
        top: 40,
        left: 19,
        width: 2,
        height: '100%',
        backgroundColor: '#E5E7EB',
    },
    timelineConnectorCompleted: {
        backgroundColor: '#10B981',
    },
    stepCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    stepCircleCompleted: {
        transform: [{ scale: 1.1 }],
    },
    stepCircleActive: {
        transform: [{ scale: 1.2 }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    completedCheck: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#10B981',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    stepInfoCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        marginLeft: 16,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    stepInfoCardActive: {
        borderWidth: 2,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    stepHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    stepTitleContainer: {
        flex: 1,
    },
    stepNumber: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    stepDuration: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    durationText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
    },
    stepDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 12,
        lineHeight: 20,
    },
    stepFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    keyPointsPreview: {
        flex: 1,
    },
    keyPointTag: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    keyPointText: {
        fontSize: 12,
        color: '#4B5563',
        flex: 1,
    },
    completeButton: {
        padding: 8,
    },
    completeButtonCompleted: {
        backgroundColor: '#D1FAE5',
        borderRadius: 20,
    },
    // Detailed View
    detailedContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    detailedStepCard: {
        marginBottom: 20,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    detailedCardGradient: {
        padding: 20,
    },
    detailedHeader: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginBottom: 20,
        gap: 4,
    },
    detailedStepNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'lowercase',
    },
    detailedStepTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 4,
    },
    detailedDurationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailedDurationText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    detailedDescription: {
        fontSize: 16,
        color: '#4B5563',
        lineHeight: 24,
        marginBottom: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionIconContainer: {
        width: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    sectionSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    keyPointsGrid: {
        gap: 12,
    },
    keyPointItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    keyPointIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyPointNumber: {
        fontSize: 14,
        fontWeight: '800',
        marginTop: 1,
    },
    keyPointItemText: {
        fontSize: 14,
        color: '#4B5563',
        flex: 1,
        lineHeight: 20,
    },
    toolsTipsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
        alignItems: 'flex-start',
    },
    toolsSection: {
        flex: 1,
    },
    toolsList: {
        gap: 8,
    },
    toolItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    toolText: {
        fontSize: 14,
        color: '#4B5563',
    },
    tipsSection: {
        flex: 1,
    },
    tipsList: {
        gap: 8,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tipText: {
        fontSize: 14,
        color: '#4B5563',
        flex: 1,
    },
    qualitySection: {
        marginBottom: 20,
    },
    qualityList: {
        gap: 12,
    },
    qualityItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    qualityCheckbox: {
        marginTop: 2,
    },
    qualityText: {
        fontSize: 14,
        color: '#4B5563',
        flex: 1,
        lineHeight: 20,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    completeStepButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        gap: 8,
    },
    completeStepButtonCompleted: {
        backgroundColor: '#D1FAE5',
    },
    completeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    completeButtonTextCompleted: {
        color: '#10B981',
    },
    viewDetailsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        gap: 4,
    },
    viewDetailsText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    // Modal
    modalContainer: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '90%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    modalGradient: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalStepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    modalStepIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    modalStepInfo: {
        flex: 1,
    },
    modalStepTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 8,
    },
    modalDuration: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    modalDurationText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    modalCloseButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
    },
    modalBody: {
        flex: 1,
        padding: 24,
    },
    modalSection: {
        marginBottom: 32,
    },
    modalSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    modalDescription: {
        fontSize: 16,
        color: '#4B5563',
        lineHeight: 24,
    },
    modalKeyPoints: {
        gap: 16,
    },
    modalKeyPoint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    keyPointIndex: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    keyPointIndexText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    modalKeyPointText: {
        fontSize: 16,
        color: '#4B5563',
        lineHeight: 24,
        flex: 1,
    },
    qualityStandards: {
        gap: 12,
    },
    qualityStandard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    qualityStandardText: {
        fontSize: 16,
        color: '#4B5563',
        lineHeight: 24,
        flex: 1,
    },
    toolsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    toolCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    toolName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E40AF',
    },
    tipCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    notesCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 20,
    },
    notesText: {
        fontSize: 16,
        color: '#4B5563',
        lineHeight: 24,
        fontStyle: 'italic',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    completeModalButton: {
        backgroundColor: colors.primary,
    },
    nextStepButton: {
        backgroundColor: '#F3F4F6',
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    bottomSpacing: {
        height: 40,
    },
});