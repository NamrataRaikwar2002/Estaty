/**
 * Listings Screen
 * Browse property listings with seller/broker details and call functionality for buyers
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { MOCK_LISTINGS } from '../../constants/mockListings';
import agoraRTCService from '../../services/agoraRTCService';
const agoraService = agoraRTCService;
import { Button, ListingCard } from '../../components';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { BorderRadius, Shadows } from '../../constants/borders';

const ListingsScreen = ({navigation}) => {
  const { user, role } = useAuth();
  const [listings] = useState(MOCK_LISTINGS);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  // Determine if current user is the owner of a listing
  const isListingOwner = useCallback((listing) => {
    if (!user) return false;
    return listing.ownerId === user.id;
  }, [user]);

  // Determine if Call button should be shown
  // Show only to buyers viewing listings they don't own
  const shouldShowCallButton = useCallback((listing) => {
    if (!user) return false;
    if (role !== 'buyer') return false; // Only buyers see call button
    if (isListingOwner(listing)) return false; // Don't show on own listings
    return true;
  }, [user, role, isListingOwner]);

  const [showCallOptions, setShowCallOptions] = useState(false);
  const [selectedListingForCall, setSelectedListingForCall] = useState(null);

  const handleCallPress = useCallback((listing) => {
    console.log('[ListingsScreen] handleCallPress:', listing?.id, listing?.ownerName);
    setSelectedListingForCall(listing);
    setShowCallOptions(true);
  }, []);

  const handleCallTypeSelect = useCallback(async (callType) => {
    console.log('[ListingsScreen] >>> handleCallTypeSelect ENTRY:', { callType, selectedListingForCall: !!selectedListingForCall, user: !!user });
    // setShowCallOptions(false);
    if (!selectedListingForCall || !user) {
      console.log('[ListingsScreen] Missing selectedListingForCall or user:', { selectedListingForCall: !!selectedListingForCall, user: !!user });
      return;
    }

    const { ownerId, ownerName, id: propertyId } = selectedListingForCall;
    console.log('[ListingsScreen] Calling startCall with:', { ownerId, callType, callerName: user.name, receiverName: ownerName, propertyId });

    try {
      // 1. Initiate call FIRST - creates Firebase invitation & joins RTC channel
      const result = await agoraService.startCall(
        ownerId,
        callType,
        user.name,        // callerName (current user)
        ownerName,        // receiverName
        propertyId
      );

      console.log('[ListingsScreen] startCall result:', result);

      if (!result.success) {
        console.error('[ListingsScreen] Call failed:', result.error);
        // TODO: Show Alert.alert('Call failed', result.error);
        // return;
      }

      // 2. Navigate AFTER successful initiation with real callId/channelName
      console.log('[ListingsScreen] Navigating to OutgoingCall with:', { remoteUserId: ownerId, callType, channelName: result.channelName, calleeName: ownerName, callId: result.callId, propertyId });
      navigation.navigate('OutgoingCall', {
        remoteUserId: ownerId,
        callType,
        channelName: result.channelName,
        calleeName: ownerName,
        callId: result.callId,
        propertyId,
      });
    } catch (error) {
      console.error('[ListingsScreen] Call initiation error:', error);
      // TODO: Show Alert.alert('Error', 'Failed to start call');
    }
  }, [navigation, selectedListingForCall, user]);

  const handleViewDetails = useCallback((listing) => {
    setSelectedListing(listing);
    setShowDetail(true);
  }, []);

  const formatPrice = (price, priceType) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const formatted = formatter.format(price);
    return priceType === 'rent' ? `${formatted}/mo` : formatted;
  };

  const Separator = useCallback(() => <View style={styles.separator} />, []);

  const HeaderComponent = useCallback(() => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Listings</Text>
      <Text style={styles.headerSubtitle}>
        {listings.length} propert{listings.length === 1 ? 'y' : 'ies'} available
      </Text>
    </View>
  ), [listings.length]);

  const FooterComponent = useCallback(() => (
    <View style={styles.listPaddingBottom} />
  ), []);

  const renderListingCard = ({ item }) => {
    const showCall = shouldShowCallButton(item);
    const owner = isListingOwner(item);

    return (
      <ListingCard
        listing={item}
        onPress={() => handleViewDetails(item)}
        onCallPress={() => handleCallPress(item)}
        isOwner={owner}
        showCallButton={showCall}
      />
    );
  };

  if (listings.length === 0) {
    return (
      <View style={styles.screenContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Listings</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏠</Text>
          <Text style={styles.emptyTitle}>No Listings Available</Text>
          <Text style={styles.emptyText}>
            Check back later for new properties
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <FlatList
        data={listings}
        renderItem={renderListingCard}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={HeaderComponent}
        ListFooterComponent={FooterComponent}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Listing Detail Modal */}
      {showDetail && selectedListing && (
        <View style={styles.modalOverlay} onTouchStart={() => setShowDetail(false)}>
          <View style={styles.modalContainer} onTouchStart={() => {}}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowDetail(false)}
              accessibilityLabel="Close details"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Image
                source={{ uri: selectedListing.images[0] }}
                style={styles.modalImage}
                resizeMode="cover"
              />
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{selectedListing.title}</Text>
                <Text style={styles.modalPrice}>{formatPrice(selectedListing.price, selectedListing.priceType)}</Text>

                <View style={styles.modalLocation}>
                  <Text style={styles.modalLocationIcon}>📍</Text>
                  <Text style={styles.modalLocationText}>{selectedListing.address.fullAddress}</Text>
                </View>

                <Text style={styles.modalDescription}>{selectedListing.description}</Text>

                {/* Features */}
                <Text style={styles.modalSectionTitle}>Features</Text>
                <View style={styles.modalFeatures}>
                  {selectedListing.features.map((feature, index) => (
                    <View key={index} style={styles.modalFeature}>
                      <Text style={styles.modalFeatureText}>✓ {feature}</Text>
                    </View>
                  ))}
                </View>

                {/* Owner Details */}
                <View style={styles.modalOwnerSection}>
                  <Text style={styles.modalSectionTitle}>Listed By</Text>
                  <View style={styles.modalOwnerRow}>
                    <View style={styles.modalOwnerAvatar}>
                      <Text style={styles.modalOwnerAvatarText}>
                        {selectedListing.ownerName?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={styles.modalOwnerInfo}>
                      <Text style={styles.modalOwnerName}>{selectedListing.ownerName}</Text>
                      <Text style={styles.modalOwnerRole}>
                        {selectedListing.ownerRole === 'seller' ? '👤 Seller' : '🤝 Broker'}
                      </Text>
                    </View>
                  </View>

                  {/* Call Button in Modal */}
                  {shouldShowCallButton(selectedListing) && (
                    <Button
                      title="Call Now"
                      variant="primary"
                      size="lg"
                      fullWidth={true}
                      leftIcon="📞"
                      onPress={() => handleCallPress(selectedListing)}
                      style={styles.modalCallButton}
                      testID="modal-call-button"
                      accessibilityLabel={`Call ${selectedListing.ownerName}`}
                    />
                  )}

                  {isListingOwner(selectedListing) && (
                    <View style={styles.modalOwnerBadge}>
                      <Text style={styles.modalOwnerBadgeText}>This is your listing</Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Call Options Modal */}
{showCallOptions && selectedListingForCall && (
        <View style={styles.callOptionsOverlay}>
          <View style={styles.callOptionsContainer}>
            <View style={styles.callOptionsHeader}>
              <Text style={styles.callOptionsTitle}>Call {selectedListingForCall.ownerName}</Text>
              <TouchableOpacity
                onPress={() => setShowCallOptions(false)}
                accessibilityLabel="Close"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.callOptionsClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.callOptionsList}>
              <TouchableOpacity
                style={styles.callOptionButton}
                onPress={() => {
                  console.log('[ListingsScreen] >>> Voice call button PRESSED - ENTRY');
                  console.log('[ListingsScreen] >>> selectedListingForCall:', selectedListingForCall ? selectedListingForCall.id : null);
                  console.log('[ListingsScreen] >>> user:', user ? user.id : null);
                  handleCallTypeSelect('audio');
                }}
                onPressIn={() => console.log('[ListingsScreen] >>> Voice call button PressIn')}
                onPressOut={() => console.log('[ListingsScreen] >>> Voice call button PressOut')}
                activeOpacity={0.8}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                accessibilityLabel="Start voice call"
                testID="voice-call-option"
              >
                <View style={styles.callOptionIconContainer}>
                  <Text style={styles.callOptionIcon}>📞</Text>
                </View>
                <View style={styles.callOptionTextContainer}>
                  <Text style={styles.callOptionLabel}>Voice Call</Text>
                  <Text style={styles.callOptionDescription}>Audio only call</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.callOptionButton}
                onPress={() => {
                  console.log('[ListingsScreen] >>> Video call button PRESSED');
                  handleCallTypeSelect('video');
                }}
                onPressIn={() => console.log('[ListingsScreen] >>> Video call button PressIn')}
                onPressOut={() => console.log('[ListingsScreen] >>> Video call button PressOut')}
                activeOpacity={0.8}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                accessibilityLabel="Start video call"
                testID="video-call-option"
              >
                <View style={styles.callOptionIconContainer}>
                  <Text style={styles.callOptionIcon}>📹</Text>
                </View>
                <View style={styles.callOptionTextContainer}>
                  <Text style={styles.callOptionLabel}>Video Call</Text>
                  <Text style={styles.callOptionDescription}>Audio and video call</Text>
                </View>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.callOptionsCancel}
              onPress={() => setShowCallOptions(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.callOptionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  header: {
    paddingHorizontal: Spacing.screenPaddingHorizontal,
    paddingVertical: Spacing.lg,
    paddingTop: Spacing.xl + 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: {
    ...Typography.styles.h3,
    fontWeight: '700',
    color: Colors.text.primary.light,
  },
  headerSubtitle: {
    ...Typography.styles.caption,
    color: Colors.text.secondary.light,
    marginTop: Spacing.xs,
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenPaddingHorizontal,
    paddingVertical: Spacing.xl,
    justifyContent: 'center',
  },
  listPaddingTop: {
    paddingTop: Spacing.md,
  },
  listPaddingBottom: {
    paddingBottom: Spacing.xl + 20,
  },
  separator: {
    height: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.styles.h5,
    fontWeight: '600',
    color: Colors.text.primary.light,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    ...Typography.styles.body,
    color: Colors.text.secondary.light,
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.overlay.light,
    justifyContent: 'flex-end',
    // zIndex: 100,
  },
  modalContainer: {
    backgroundColor: Colors.surface.light,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    ...Shadows.modal,
  },
  modalClose: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface.light,
    alignItems: 'center',
    justifyContent: 'center',
    // zIndex: 10,
    ...Shadows.button,
  },
  modalCloseText: {
    fontSize: 20,
    color: Colors.text.primary.light,
    fontWeight: '300',
  },
  modalImage: {
    width: '100%',
    height: 280,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  modalContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalTitle: {
    ...Typography.styles.h4,
    fontWeight: '700',
    color: Colors.text.primary.light,
  },
  modalPrice: {
    ...Typography.styles.h4,
    fontWeight: '700',
    color: Colors.primary[500],
  },
  modalLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  modalLocationIcon: {
    fontSize: 16,
  },
  modalLocationText: {
    ...Typography.styles.body,
    color: Colors.text.secondary.light,
    flex: 1,
  },
  modalDescription: {
    ...Typography.styles.body,
    color: Colors.text.primary.light,
    lineHeight: 22,
  },
  modalSectionTitle: {
    ...Typography.styles.label,
    fontWeight: '700',
    color: Colors.text.primary.light,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  modalFeature: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[50],
  },
  modalFeatureText: {
    ...Typography.styles.caption,
    color: Colors.text.secondary.light,
  },
  modalOwnerSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  modalOwnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  modalOwnerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOwnerAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary[700],
  },
  modalOwnerInfo: {
    flex: 1,
  },
  modalOwnerName: {
    ...Typography.styles.h5,
    fontWeight: '600',
    color: Colors.text.primary.light,
  },
  modalOwnerRole: {
    ...Typography.styles.body,
    color: Colors.text.secondary.light,
    marginTop: Spacing.xs,
  },
  modalOwnerContact: {
    ...Typography.styles.bodySmall,
    color: Colors.text.secondary.light,
    marginTop: 2,
  },
  modalCallButton: {
    marginTop: Spacing.md,
  },
  modalOwnerBadge: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[50],
    marginTop: Spacing.md,
  },
  modalOwnerBadgeText: {
    ...Typography.styles.body,
    fontWeight: '600',
    color: Colors.primary[700],
  },

  // Call Options Modal
  callOptionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.overlay.light,
    justifyContent: 'flex-end',
    // zIndex: 100,
  },
  callOptionsContainer: {
    backgroundColor: Colors.surface.light,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    paddingBottom: Spacing.xl + 20,
    ...Shadows.modal,
  },
  callOptionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  callOptionsTitle: {
    ...Typography.styles.h5,
    fontWeight: '600',
    color: Colors.text.primary.light,
  },
  callOptionsClose: {
    fontSize: 24,
    color: Colors.text.secondary.light,
  },
  callOptionsList: {
    gap: Spacing.md,
  },
  callOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface.light,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: Spacing.md,
  },
  callOptionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  callOptionIcon: {
    fontSize: 24,
  },
  callOptionTextContainer: {
    flex: 1,
  },
  callOptionLabel: {
    ...Typography.styles.body,
    fontWeight: '600',
    color: Colors.text.primary.light,
  },
  callOptionDescription: {
    ...Typography.styles.caption,
    color: Colors.text.secondary.light,
    marginTop: Spacing.xs,
  },
  callOptionsCancel: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.neutral[100],
  },
  callOptionsCancelText: {
    ...Typography.styles.button,
    fontWeight: '600',
    color: Colors.text.primary.light,
  },
});

export default ListingsScreen;