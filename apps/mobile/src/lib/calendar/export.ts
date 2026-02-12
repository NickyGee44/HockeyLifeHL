import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Write an .ics string to a temporary file and open the system share sheet.
 */
export async function shareIcalFile(content: string, filename: string): Promise<void> {
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/calendar',
      UTI: 'com.apple.ical.ics',
      dialogTitle: 'Add to Calendar',
    });
  }
}
