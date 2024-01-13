export function removeArrayItem<T>(array: T[], item: T) {
    const index = array.indexOf(item);
    if (index && index >= 0) {
        array.splice(index, 1);
        return true;
    }
    return false;
}