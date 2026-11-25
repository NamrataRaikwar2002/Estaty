/**
 * Listing Card Component
 * Displays property listing with owner info and call button for buyers
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Button } from './index';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { BorderRadius, Shadows } from '../constants/borders';

const ListingCard = ({
  listing,
  onPress,
  onCallPress,
  isOwner,
  showCallButton,
}) => {
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

  const getPropertyTypeLabel = (type) => {
    const labels = {
      apartment: 'Apartment',
      house: 'House',
      condo: 'Condo',
      townhouse: 'Townhouse',
      penthouse: 'Penthouse',
      studio: 'Studio',
      land: 'Land',
      commercial: 'Commercial',
    };
    return labels[type] || type;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Property Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: listing.images[0] }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay}>
          <View style={styles.badgesRow}>
            <View style={[
              styles.badge,
              { backgroundColor: listing.priceType === 'rent' ? Colors.info : Colors.primary[500] },
            ]}>
              <Text style={styles.badgeText}>
                {listing.priceType === 'rent' ? 'For Rent' : 'For Sale'}
              </Text>
            </View>
            <View style={[
              styles.badge,
              { backgroundColor: listing.status === 'active' ? Colors.success : Colors.warning },
            ]}>
              <Text style={styles.badgeText}>
                {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Card Content */}
      <View style={styles.cardContent}>
        {/* Title and Price */}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{listing.title}</Text>
          <Text style={styles.price}>{formatPrice(listing.price, listing.priceType)}</Text>
        </View>

        {/* Location */}
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {listing.address.city}, {listing.address.state}
          </Text>
        </View>

        {/* Property Details */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🛏️</Text>
            <Text style={styles.detailText}>
              {listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} BR`}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🛁</Text>
            <Text style={styles.detailText}>
              {listing.bathrooms} BA
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>📐</Text>
            <Text style={styles.detailText}>
              {listing.area.toLocaleString()} sq ft
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🏷️</Text>
            <Text style={styles.detailText}>
              {getPropertyTypeLabel(listing.propertyType)}
            </Text>
          </View>
        </View>

        {/* Owner Info */}
        <View style={styles.ownerRow}>
          <View style={styles.ownerAvatar}>
            <Text style={styles.ownerAvatarText}>
              {listing.ownerName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.ownerInfo}>
            <Text style={styles.ownerLabel}>
              {isOwner ? 'Your Listing' : `Listed by ${listing.ownerName}`}
            </Text>
            <Text style={styles.ownerRole}>
              {listing.ownerRole === 'seller' ? '👤 Seller' : '🤝 Broker'}
            </Text>
          </View>
        </View>

        {/* Call Button - Only for buyers on non-owned listings */}
        {showCallButton && (
          <Button
            title="Call"
            variant="primary"
            size="md"
            fullWidth={true}
            leftIcon="📞"
            onPress={onCallPress}
            testID={`call-button-${listing.id}`}
            accessibilityLabel={`Call ${listing.ownerName}`}
          />
        )}

        {/* Owner indicator */}
        {isOwner && (
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerBadgeText}>Your Listing</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface.light,
    borderRadius: BorderRadius.card,
    marginHorizontal: Spacing.screenPaddingHorizontal,
    ...Shadows.card,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 200,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
  },
  imageOverlay: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    ...Typography.styles.caption,
    fontWeight: '600',
    color: Colors.text.inverse.light,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    ...Typography.styles.h5,
    fontWeight: '600',
    color: Colors.text.primary.light,
    flex: 1,
    marginRight: Spacing.md,
  },
  price: {
    ...Typography.styles.h5,
    fontWeight: '700',
    color: Colors.primary[500],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  locationIcon: {
    fontSize: 14,
  },
  locationText: {
    ...Typography.styles.bodySmall,
    color: Colors.text.secondary.light,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
    minWidth: '40%',
  },
  detailIcon: {
    fontSize: 14,
  },
  detailText: {
    ...Typography.styles.caption,
    color: Colors.text.secondary.light,
    fontWeight: '500',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  ownerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvatarText: {
    ...Typography.styles.label,
    fontWeight: '700',
    color: Colors.primary[700],
  },
  ownerInfo: {
    flex: 1,
  },
  ownerLabel: {
    ...Typography.styles.bodySmall,
    color: Colors.text.primary.light,
    fontWeight: '600',
  },
  ownerRole: {
    ...Typography.styles.caption,
    color: Colors.text.secondary.light,
  },
  ownerBadge: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[50],
    marginTop: Spacing.xs,
  },
  ownerBadgeText: {
    ...Typography.styles.caption,
    fontWeight: '600',
    color: Colors.primary[700],
  },
});

export default ListingCard;